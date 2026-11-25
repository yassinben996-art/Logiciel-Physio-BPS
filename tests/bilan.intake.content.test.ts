import { QUESTIONNAIRES } from '@q';
import { SHOULDER } from '../src/bilan/content';
import { INTAKE } from '../src/bilan/content/intake';
import { validateIntake, validateZone } from '../src/bilan/content/validate';
import { SL } from '../src/data/items';

describe('contenu de l’accueil', () => {
  it('valide', () => expect(validateIntake(INTAKE)).toEqual([]));
  it('épaule valide avec l’accueil', () =>
    expect(validateZone(SHOULDER, [...QUESTIONNAIRES.map((q) => q.id), 'psfs'], INTAKE)).toEqual([]));
  it('tout est provisoire', () => {
    expect(INTAKE.questions.every((q) => q.source.provisional === true)).toBe(true);
    expect(INTAKE.pens.every((p) => p.source.provisional === true)).toBe(true);
  });
  it('ordre des questions', () =>
    expect(INTAKE.questions.map((q) => q.id)).toEqual([
      'zones',
      'cote',
      'duree',
      'debut',
      'douleur',
      'chart',
      'psfs',
      'exp',
      'fear',
      'worry',
      'sommeil',
      'arret',
    ]));
  it('crayon du patient', () => expect(INTAKE.patientPen).toBe('douleur'));
  it('crayons', () =>
    expect(INTAKE.pens.map((p) => p.id)).toEqual([
      'douleur',
      'irradiation',
      'fourmillements',
      'engourdissement',
    ]));
  it('textes repris du PDDM', () => {
    const exp = INTAKE.questions.find((q) => q.id === 'exp')!;
    const sl = SL.find((s) => s.id === 'exp')!;
    expect(exp.patient).toBe(sl.label);
    expect(exp.kind === 'scale' && exp.lo === sl.lo && exp.hi === sl.hi).toBe(true);
  });
  it('côté seulement si épaule', () =>
    expect(INTAKE.questions.find((q) => q.id === 'cote')).toMatchObject({
      showIf: { id: 'zones', includes: 'shoulder' },
    }));
});
