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
      'force',
      'tests',
      'modif',
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
