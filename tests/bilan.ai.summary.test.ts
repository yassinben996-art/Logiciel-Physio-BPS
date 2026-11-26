import { SHOULDER } from '../src/bilan/content';
import { INTAKE } from '../src/bilan/content/intake';
import { scrub } from '../src/bilan/ai/scrub';
import { buildSummary } from '../src/bilan/ai/summary';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';

const ctx = { names: ['Bensaid', 'Yassine'] };

describe('nettoyage des textes libres', () => {
  it('nom du patient, téléphone, e-mail masqués ; date et lieu gardés', () =>
    expect(scrub('Vu Yassine Bensaïd le 12.03.2024 à Lausanne, tél 079 123 45 67, yass@x.ch', ctx)).toBe(
      'Vu [nom] [nom] le 12.03.2024 à Lausanne, tél [téléphone], [e-mail]',
    ));
  it('insensible à la casse et aux accents', () => {
    const out = scrub('yassine dit que BENSAÏD est fatigué', ctx);
    expect(out.toLowerCase()).not.toContain('yassine');
    expect(out.toLowerCase()).not.toContain('bensa');
  });
  it('tout le reste est gardé : tests, médecins, dates écrites, lieux', () => {
    const t =
      'Test de Neer positif, Patte et Gerber négatifs. Adressé par le Dr Martin, Lundi 12 mars, habite rue de Bourg 3.';
    expect(scrub(t, ctx)).toBe(t);
  });
});

describe('résumé envoyé à l’IA', () => {
  const b = (): BilanState => {
    const e = emptyBilan('shoulder');
    return {
      ...e,
      code: 'B-1234',
      identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' },
      notes: { 'anamnese.notes': 'Marie a mal depuis le 3 mars' },
      intake: {
        ...e.intake,
        status: 'physio',
        answers: { psfs: [{ activity: 'porter Dupont junior', score: 4 }] },
      },
    };
  };
  it('aucune identité, aucun code, aucun id', () => {
    const s = b();
    const out = buildSummary(SHOULDER, s, INTAKE);
    expect(out).not.toMatch(/Dupont|Marie|B-1234|1980/);
    expect(out).not.toContain(s.id);
    expect(out).toContain('[nom] a mal depuis le 3 mars');
    expect(out.split('\n')[0]).toBe('Zone : Épaule');
    expect(out).not.toContain('Accueil : rempli');
  });
  it('bilan vide', () =>
    expect(buildSummary(SHOULDER, emptyBilan('shoulder'), INTAKE)).toBe('Zone : Épaule'));
});
