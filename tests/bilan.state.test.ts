import {
  LABEL_STATUS,
  bilanReducer,
  emptyBilan,
  ignoredAiLabels,
  isDirty,
  normalizeBilan,
} from '../src/bilan/state/bilan';

const e = emptyBilan('shoulder');

describe('bilanReducer', () => {
  it('num dans les bornes', () => {
    const s = bilanReducer(e, { type: 'num', key: 'mobilite.abd_a.D', value: 150, min: 0, max: 200 });
    expect(s.nums['mobilite.abd_a.D']).toBe(150);
    expect(s.invalid['mobilite.abd_a.D']).toBeUndefined();
  });
  it('num hors bornes → invalide, ignoré', () => {
    const a = bilanReducer(e, { type: 'num', key: 'k', value: 120, min: 0, max: 200 });
    const s = bilanReducer(a, { type: 'num', key: 'k', value: 500, min: 0, max: 200 });
    expect(s.nums.k).toBeUndefined();
    expect(s.invalid.k).toBe(true);
  });
  it('num négatif → invalide', () => {
    const s = bilanReducer(e, { type: 'num', key: 'k', value: -1, min: 0, max: 100 });
    expect(s.nums.k).toBeUndefined();
    expect(s.invalid.k).toBe(true);
  });
  it('num null → retiré de nums et invalid', () => {
    const a = bilanReducer(e, { type: 'num', key: 'k', value: 500, min: 0, max: 200 });
    const b = bilanReducer(a, { type: 'num', key: 'j', value: 5, min: 0, max: 200 });
    const s = bilanReducer(bilanReducer(b, { type: 'num', key: 'k', value: null, min: 0, max: 200 }), {
      type: 'num',
      key: 'j',
      value: null,
      min: 0,
      max: 200,
    });
    expect('k' in s.invalid).toBe(false);
    expect('j' in s.nums).toBe(false);
  });
  it('test null → retiré', () => {
    const a = bilanReducer(e, { type: 'test', key: 'tests.full_can', value: 'pos' });
    expect(a.tests['tests.full_can']).toBe('pos');
    expect(
      'tests.full_can' in bilanReducer(a, { type: 'test', key: 'tests.full_can', value: null }).tests,
    ).toBe(false);
  });
  it('chip false → retiré', () => {
    const a = bilanReducer(e, { type: 'chip', key: 'a.b.c', value: true });
    expect(a.chips['a.b.c']).toBe(true);
    expect('a.b.c' in bilanReducer(a, { type: 'chip', key: 'a.b.c', value: false }).chips).toBe(false);
  });
  it('choice null → retiré', () => {
    const a = bilanReducer(e, { type: 'choice', key: 'a.b', value: 'x' });
    expect('a.b' in bilanReducer(a, { type: 'choice', key: 'a.b', value: null }).choices).toBe(false);
  });
  it('accept deux fois → une seule occurrence', () => {
    const s = bilanReducer(bilanReducer(e, { type: 'accept', id: 'r' }), { type: 'accept', id: 'r' });
    expect(s.accepted).toEqual(['r']);
  });
  it('dismiss deux fois → une seule occurrence', () => {
    const s = bilanReducer(bilanReducer(e, { type: 'dismiss', id: 'r' }), { type: 'dismiss', id: 'r' });
    expect(s.dismissed).toEqual(['r']);
  });
  it('isDirty', () => {
    expect(isDirty(e)).toBe(false);
    expect(isDirty(bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' }))).toBe(true);
  });
  it('note vide → retirée', () => {
    const a = bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' });
    expect(isDirty(bilanReducer(a, { type: 'note', key: 'anamnese.notes', value: '' }))).toBe(false);
  });
  it('reset → nouvel id et code, vide, même zone', () => {
    const a = bilanReducer(e, { type: 'note', key: 'anamnese.notes', value: 'x' });
    const s = bilanReducer(a, { type: 'reset' });
    expect(s.id).not.toBe(a.id);
    expect(s.zone).toBe('shoulder');
    expect(isDirty(s)).toBe(false);
  });
  it('identity → dirty', () => {
    const s = bilanReducer(e, { type: 'identity', field: 'nom', value: 'Dupont' });
    expect(s.identity.nom).toBe('Dupont');
    expect(isDirty(s)).toBe(true);
  });
  it('code B-xxxx et id', () => {
    expect(e.code).toMatch(/^B-\d{4}$/);
    expect(e.id).toBeTruthy();
  });
  it('load remplace l’état tel quel', () => {
    const other = { ...emptyBilan('shoulder'), notes: { 'a.notes': 'y' } };
    expect(bilanReducer(e, { type: 'load', bilan: other })).toBe(other);
  });
  it('immuable', () => {
    const before = JSON.stringify(e);
    bilanReducer(e, { type: 'chip', key: 'a.b.c', value: true });
    expect(JSON.stringify(e)).toBe(before);
  });
  it('updatedAt modifié par une saisie', () => {
    const s = bilanReducer(
      { ...e, updatedAt: '2000-01-01T00:00:00.000Z' },
      { type: 'note', key: 'x.notes', value: 'a' },
    );
    expect(s.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });
});

describe('accueil', () => {
  it('vide au départ', () =>
    expect(emptyBilan('shoulder').intake).toEqual({
      status: 'none',
      patientAt: '',
      answers: {},
      original: {},
      strokes: [],
    }));
  it('réponse du patient puis correction du physio', () => {
    const a = bilanReducer(e, { type: 'intake', id: 'douleur', value: 7, by: 'patient' });
    expect(a.intake.answers.douleur).toBe(7);
    expect(a.intake.original.douleur).toBe(7);
    const b = bilanReducer(a, { type: 'intake', id: 'douleur', value: 5, by: 'physio' });
    expect(b.intake.answers.douleur).toBe(5);
    expect(b.intake.original.douleur).toBe(7);
    const c = bilanReducer(b, { type: 'intake', id: 'douleur', value: null, by: 'physio' });
    expect('douleur' in c.intake.answers).toBe(false);
    expect(c.intake.original.douleur).toBe(7);
  });
  it('statut patient renseigne la date', () => {
    const s = bilanReducer(e, { type: 'intakeStatus', status: 'patient' });
    expect(s.intake.status).toBe('patient');
    expect(s.intake.patientAt).not.toBe('');
  });
  it('traits du physio : ajout, annulation, gomme', () => {
    const stroke = { pen: 'douleur', view: 'front' as const, by: 'physio' as const, pts: [60, 90, 62, 92] };
    const two = bilanReducer(bilanReducer(e, { type: 'stroke', stroke }), {
      type: 'stroke',
      stroke: { ...stroke, pen: 'irradiation' },
    });
    expect(bilanReducer(two, { type: 'undoStroke' }).intake.strokes).toEqual([stroke]);
    expect(bilanReducer(two, { type: 'eraseStroke', index: 0 }).intake.strokes.map((x) => x.pen)).toEqual([
      'irradiation',
    ]);
    expect(isDirty(bilanReducer(e, { type: 'stroke', stroke }))).toBe(true);
  });
  it('isDirty après une réponse', () =>
    expect(isDirty(bilanReducer(e, { type: 'intake', id: 'duree', value: 'gt3m', by: 'physio' }))).toBe(
      true,
    ));
  it('libellés des statuts', () => {
    expect(LABEL_STATUS.none).toBe('non fait');
    expect(LABEL_STATUS.patient).toBe('rempli par le patient');
    expect(LABEL_STATUS.physio).toBe('rempli par le physio en séance');
  });
  it('normalizeBilan complète un bilan du plan 1', () => {
    const { intake: _drop, ...old } = { ...emptyBilan('shoulder'), notes: { 'a.notes': 'x' } };
    void _drop;
    const n = normalizeBilan(old);
    expect(n.intake.status).toBe('none');
    expect(n.intake.strokes).toEqual([]);
    expect(n.notes).toEqual({ 'a.notes': 'x' });
    expect(n.id).toBe(old.id);
  });
});

describe('traits du patient protégés', () => {
  const ps = { pen: 'douleur', view: 'front' as const, by: 'patient' as const, pts: [60, 90, 62, 92] };
  const ph = { ...ps, by: 'physio' as const, pen: 'irradiation' };
  const two = bilanReducer(bilanReducer(e, { type: 'stroke', stroke: ps }), { type: 'stroke', stroke: ph });
  it('la gomme n’efface pas un trait du patient', () =>
    expect(bilanReducer(two, { type: 'eraseStroke', index: 0 }).intake.strokes).toEqual([ps, ph]));
  it('annuler retire le dernier trait du physio, jamais celui du patient', () => {
    const a = bilanReducer(two, { type: 'undoStroke' });
    expect(a.intake.strokes).toEqual([ps]);
    expect(bilanReducer(a, { type: 'undoStroke' }).intake.strokes).toEqual([ps]);
  });
});

describe('bilans enregistrés avec l’accueil de la PR #6', () => {
  it('les réponses sont reprises dans le nouveau format', () => {
    const old = {
      ...emptyBilan('knee'),
      intake: {
        painNow: 4,
        painWorst: 7,
        duration: 'gt3m',
        onset: 'trauma',
        regions: ['genou_d'],
        psfs: [{ activity: 'monter les escaliers', score: 3 }],
        screening: { sommeil: true, arret: false, travail: true, peur: true, isole: false },
        completedAt: '2026-11-25T16:00:00.000Z',
      },
    };
    const n = normalizeBilan(old);
    expect(n.intake.answers).toEqual({
      douleur_actuelle: 4,
      douleur_pire: 7,
      duree: 'gt3m',
      debut: 'trauma',
      psfs: [{ activity: 'monter les escaliers', score: 3 }],
      sommeil: 'oui',
      arret: 'non',
      pression: 'oui',
    });
    expect(n.intake.original).toEqual(n.intake.answers);
    expect(n.intake.status).toBe('patient');
    expect(n.intake.patientAt).toBe('2026-11-25T16:00:00.000Z');
    expect(n.intake.strokes).toEqual([]);
  });
  it('accueil de la PR #6 non terminé → statut « non fait »', () =>
    expect(
      normalizeBilan({
        ...emptyBilan('knee'),
        intake: {
          painNow: 2,
          painWorst: null,
          duration: null,
          onset: null,
          regions: [],
          psfs: [],
          screening: {},
          completedAt: '',
        },
      }).intake.status,
    ).toBe('none'));
});

describe('suggestions de l’IA', () => {
  const sug = (id: string, label: string) => ({
    id,
    kind: 'hypothese' as const,
    label,
    reason: `raison ${label}`,
  });
  const base = emptyBilan('shoulder');
  const r1 = bilanReducer(base, {
    type: 'aiResult',
    provider: 'Groq',
    model: 'openai/gpt-oss-120b',
    items: [sug('a', 'A'), sug('b', 'B'), sug('c', 'C')],
  });
  it('vide au départ, et pour un bilan ancien', () => {
    expect(base.ai).toBeNull();
    const { ai: _a, ...old } = base;
    void _a;
    expect(normalizeBilan(old).ai).toBeNull();
  });
  it('résultat : éléments en attente', () => {
    expect(r1.ai!.provider).toBe('Groq');
    expect(r1.ai!.items.map((i) => i.status)).toEqual(['pending', 'pending', 'pending']);
  });
  it('« Noter » ajoute la ligne au raisonnement', () => {
    const withNote = bilanReducer(
      { ...r1, notes: { 'raisonnement.notes': 'Hypothèse : tendinopathie' } },
      { type: 'aiStatus', id: 'a', status: 'noted' },
    );
    expect(withNote.notes['raisonnement.notes']).toBe(
      'Hypothèse : tendinopathie\nSuggestion IA (non sourcée) : A — raison A',
    );
    const fresh = bilanReducer(r1, { type: 'aiStatus', id: 'a', status: 'noted' });
    expect(fresh.notes['raisonnement.notes']).toBe('Suggestion IA (non sourcée) : A — raison A');
  });
  it('nouvelle demande : gardés ajoutés, notés et ignorés ; en attente remplacés', () => {
    let s = bilanReducer(r1, { type: 'aiStatus', id: 'a', status: 'noted' });
    s = bilanReducer(s, { type: 'aiStatus', id: 'b', status: 'added' });
    s = bilanReducer(s, { type: 'aiStatus', id: 'c', status: 'ignored' });
    s = bilanReducer(s, {
      type: 'aiResult',
      provider: 'OpenRouter',
      model: 'm',
      items: [sug('d', 'D'), sug('e', 'E')],
    });
    expect(s.ai!.items.map((i) => `${i.id}:${i.status}`)).toEqual([
      'a:noted',
      'b:added',
      'c:ignored',
      'd:pending',
      'e:pending',
    ]);
    expect(ignoredAiLabels(s)).toEqual(['C']);
    expect(s.ai!.provider).toBe('OpenRouter');
  });
});
