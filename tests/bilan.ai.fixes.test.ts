import { QUESTIONNAIRES } from '@q';
import { SHOULDER } from '../src/bilan/content';
import { INTAKE } from '../src/bilan/content/intake';
import { parseAiResponse } from '../src/bilan/ai/response';
import { scrub } from '../src/bilan/ai/scrub';
import { buildSummary } from '../src/bilan/ai/summary';
import { bilanReducer, emptyBilan, ignoredAiLabels } from '../src/bilan/state/bilan';

const qs = QUESTIONNAIRES.map((q) => ({ id: q.id, name: q.name }));

describe('corrections de la relecture (IA)', () => {
  it('ids uniques d’une demande à l’autre : ignorer une nouvelle suggestion ne touche pas l’ancienne', () => {
    const neer = parseAiResponse(
      JSON.stringify({ suggestions: [{ type: 'test', label: 'Test de Neer', reason: 'r' }] }),
      SHOULDER,
      qs,
    );
    let s = bilanReducer(emptyBilan('shoulder'), {
      type: 'aiResult',
      provider: 'Groq',
      model: 'm',
      items: neer,
    });
    s = bilanReducer(s, { type: 'aiStatus', id: s.ai!.items[0]!.id, status: 'added' });
    s = bilanReducer(s, { type: 'aiResult', provider: 'Groq', model: 'm', items: neer });
    const ids = s.ai!.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(2);
    s = bilanReducer(s, { type: 'aiStatus', id: ids[1]!, status: 'ignored' });
    expect(s.ai!.items.map((i) => i.status)).toEqual(['added', 'ignored']);
  });

  it('élément non objet ignoré, les suggestions valides restent', () =>
    expect(
      parseAiResponse(
        '{"suggestions":[null, 3, "x", {"type":"test","label":"Neer","reason":"r"}]}',
        SHOULDER,
        qs,
      ),
    ).toHaveLength(1));

  it('résumé trop long : les notes les plus longues sont raccourcies', () => {
    const s = {
      ...emptyBilan('shoulder'),
      notes: { 'anamnese.notes': 'douleur '.repeat(8000), 'plan.notes': 'court' },
    };
    const out = buildSummary(SHOULDER, s, INTAKE);
    expect(out.length).toBeLessThanOrEqual(24000);
    expect(out).toContain('[raccourci]');
    expect(out).toContain('court');
  });

  it('nom court ou en plusieurs mots du patient', () => {
    expect(scrub('Li a mal, li revient demain', { names: ['Li', 'Wei'] })).not.toMatch(/\bli\b/i);
    expect(scrub('bensaïd revient', { names: ['Ben Saïd', 'Yassine'] })).toBe('[nom] revient');
  });

  it('pas de faux téléphone', () => {
    const ctx = { names: ['Dupont'] };
    const t = 'Mise en place d’exercices, le 12.03.2024. Flexion 170 160 150 140.';
    expect(scrub(t, ctx)).toBe(t);
    expect(scrub('tél 079 123 45 67 ou +41 79 123 45 67', ctx)).toBe('tél [téléphone] ou [téléphone]');
  });

  it('« Déjà écarté » arrive dans le résumé', () => {
    const items = parseAiResponse(
      JSON.stringify({ suggestions: [{ type: 'hypothese', label: 'Capsulite', reason: 'r' }] }),
      SHOULDER,
      qs,
    );
    let s = bilanReducer(emptyBilan('shoulder'), { type: 'aiResult', provider: 'G', model: 'm', items });
    s = bilanReducer(s, { type: 'aiStatus', id: s.ai!.items[0]!.id, status: 'ignored' });
    expect(buildSummary(SHOULDER, s, INTAKE, ignoredAiLabels(s))).toContain('Déjà écarté : Capsulite');
  });
});
