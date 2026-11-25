import { QUESTIONNAIRES } from '@q';
import { KNEE, SHOULDER, ZONES } from '../src/bilan/content';
import type { FieldDef, Source, ZoneDef } from '../src/bilan/content/types';
import { validateZone } from '../src/bilan/content/validate';
import { INTAKE } from '../src/bilan/content/intake';

const allSources = (z: ZoneDef): Source[] => [
  ...z.sections.flatMap((s) => [
    s.source,
    ...s.fields.flatMap((f) => [
      f.source,
      ...(f.kind === 'chips' ? f.chips.map((c) => c.source) : []),
      ...(f.kind === 'test' && f.dx ? [f.dx.source] : []),
    ]),
  ]),
  ...z.rules.map((r) => r.source),
];
const allTests = (z: ZoneDef) =>
  z.sections
    .flatMap((s) => s.fields)
    .filter((f): f is Extract<FieldDef, { kind: 'test' }> => f.kind === 'test');

describe('contenu épaule', () => {
  it('épaule valide', () =>
    expect(validateZone(SHOULDER, [...QUESTIONNAIRES.map((q) => q.id), 'psfs'], INTAKE)).toEqual([]));
  it('tout est marqué provisoire', () =>
    expect(allSources(SHOULDER).every((s) => s.provisional === true)).toBe(true));
  it('ordre des sections', () =>
    expect(SHOULDER.sections.map((s) => s.id)).toEqual([
      'anamnese',
      'drapeaux',
      'mobilite',
      'raide',
      'instable',
      'cervical',
      'ac',
      'tests',
      'modif',
      'force',
      'raisonnement',
      'plan',
    ]));
  it('aucun dx chiffré dans le provisoire', () => expect(allTests(SHOULDER).some((t) => t.dx)).toBe(false));
  it('chaque section a un champ notes', () =>
    expect(SHOULDER.sections.every((s) => s.fields.some((f) => f.kind === 'notes' && f.id === 'notes'))).toBe(
      true,
    ));
  it('ZONES contient l’épaule puis le genou', () => expect(Object.keys(ZONES)).toEqual(['shoulder', 'knee']));
});

describe('contenu genou', () => {
  it('genou valide', () =>
    expect(validateZone(KNEE, [...QUESTIONNAIRES.map((q) => q.id), 'psfs'])).toEqual([]));
  it('tout est marqué provisoire', () =>
    expect(allSources(KNEE).every((s) => s.provisional === true)).toBe(true));
  it('ordre des sections', () =>
    expect(KNEE.sections.map((s) => s.id)).toEqual([
      'anamnese',
      'drapeaux',
      'epanchement',
      'mobilite',
      'force',
      'performance',
      'tests',
      'raisonnement',
      'plan',
    ]));
  it('aucun dx chiffré dans le provisoire', () => expect(allTests(KNEE).some((t) => t.dx)).toBe(false));
  it('chaque section a un champ notes', () =>
    expect(KNEE.sections.every((s) => s.fields.some((f) => f.kind === 'notes' && f.id === 'notes'))).toBe(
      true,
    ));
  it('les critères d’Ottawa sont des drapeaux rouges', () => {
    const f = KNEE.sections.find((s) => s.id === 'drapeaux')!.fields.find((x) => x.id === 'ottawa');
    expect(f?.kind === 'chips' && f.chips.length === 5 && f.chips.every((c) => c.redFlag)).toBe(true);
  });
  it('tests clés présents', () => {
    const ids = allTests(KNEE).map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'lachman',
        'pivot_shift',
        'lever_sign',
        'tiroir_post',
        'mcmurray',
        'thessaly',
        'squat_pfp',
      ]),
    );
  });
});

describe('épaule : algorithme de classification', () => {
  const field = (s: string, f: string) =>
    SHOULDER.sections.find((x) => x.id === s)?.fields.find((y) => y.id === f);
  it('catégorie retenue : 6 options dans l’ordre de l’algorithme', () => {
    const f = field('raisonnement', 'categorie');
    expect(f?.kind === 'choice' && f.options.map((o) => o.value)).toEqual([
      'raide',
      'instable',
      'cervical',
      'ac',
      'sous_acromial',
      'persistante',
    ]);
  });
  it('irritabilité : élevée, modérée, faible', () => {
    const f = field('anamnese', 'irritabilite');
    expect(f?.kind === 'choice' && f.options.map((o) => o.value)).toEqual(['elevee', 'moderee', 'faible']);
  });
  it('faisceau de Cadogan : 5 critères', () => {
    const f = field('ac', 'cadogan');
    expect(f?.kind === 'chips' && f.chips.length).toBe(5);
  });
  it('modification des symptômes : mieux, pareil, pire', () => {
    const f = field('modif', 'scap_assist');
    expect(f?.kind === 'choice' && f.options.map((o) => o.value)).toEqual(['mieux', 'pareil', 'pire']);
  });
  it('une luxation notée fait proposer appréhension, relocation et surprise', async () => {
    const { evaluate } = await import('../src/bilan/engine/rules');
    const { emptyBilan } = await import('../src/bilan/state/bilan');
    const s = { ...emptyBilan('shoulder'), chips: { 'anamnese.signes.luxation': true as const } };
    expect(evaluate(SHOULDER, s).map((x) => x.target)).toEqual(
      expect.arrayContaining(['instable.apprehension', 'instable.relocation', 'instable.surprise']),
    );
  });
});
