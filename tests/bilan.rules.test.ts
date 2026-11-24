import { SHOULDER } from '../src/bilan/content';
import { evaluate, matches } from '../src/bilan/engine/rules';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';

const e = emptyBilan('shoulder');
const st = (p: Partial<BilanState>): BilanState => ({ ...e, ...p });
const targets = (s: BilanState) => evaluate(SHOULDER, s).map((x) => x.target);

describe('moteur de règles', () => {
  it('état vide → []', () => expect(evaluate(SHOULDER, e)).toEqual([]));
  it('full can positif → er_lag puis drop_arm', () =>
    expect(targets(st({ tests: { 'tests.full_can': 'pos' } }))).toEqual(['tests.er_lag', 'tests.drop_arm']));
  it('full can négatif → rien', () =>
    expect(targets(st({ tests: { 'tests.full_can': 'neg' } }))).toEqual([]));
  it('cible déjà testée → disparaît', () =>
    expect(targets(st({ tests: { 'tests.full_can': 'pos', 'tests.er_lag': 'neg' } }))).toEqual([
      'tests.drop_arm',
    ]));
  it('peur du mouvement → TSK', () => {
    const r = evaluate(SHOULDER, st({ chips: { 'drapeaux.jaunes.peur_mvt': true } }));
    expect(r).toContainEqual(expect.objectContaining({ kind: 'questionnaire', target: 'tsk' }));
    expect(r[0]!.label).toContain('TSK');
    expect(r[0]!.reason).toBeTruthy();
  });
  it('règle refusée → disparaît', () =>
    expect(targets(st({ chips: { 'drapeaux.jaunes.peur_mvt': true }, dismissed: ['peur-tsk'] }))).toEqual(
      [],
    ));
  it('règle acceptée → disparaît', () =>
    expect(targets(st({ chips: { 'drapeaux.jaunes.peur_mvt': true }, accepted: ['peur-tsk'] }))).toEqual([]));
  it('force RE (un côté) → er_lag', () =>
    expect(targets(st({ nums: { 'force.re.D': 12 } }))).toEqual(['tests.er_lag']));
  it('force RE invalide → rien', () => expect(targets(st({ invalid: { 'force.re.D': true } }))).toEqual([]));
  it('une cible n’apparaît qu’une fois (première règle)', () => {
    const r = evaluate(SHOULDER, st({ tests: { 'tests.full_can': 'pos' }, nums: { 'force.re.G': 10 } }));
    expect(r.filter((x) => x.target === 'tests.er_lag')).toHaveLength(1);
    expect(r[0]!.ruleId).toBe('fullcan-erlag');
  });
  it('redflag : nocturne → antécédent de cancer, sauf si déjà coché', () => {
    expect(targets(st({ chips: { 'anamnese.signes.nocturne': true } }))).toEqual([
      'drapeaux.rouges.atcd_cancer',
    ]);
    expect(
      targets(st({ chips: { 'anamnese.signes.nocturne': true, 'drapeaux.rouges.atcd_cancer': true } })),
    ).toEqual([]);
  });
  it('notes d’anamnèse → SPADI', () =>
    expect(evaluate(SHOULDER, st({ notes: { 'anamnese.notes': 'x' } }))).toContainEqual(
      expect.objectContaining({ target: 'spadi', label: expect.stringContaining('SPADI') }),
    ));
  it('any vide faux, all vide vrai', () => {
    expect(matches({ any: [] }, e)).toBe(false);
    expect(matches({ all: [] }, e)).toBe(true);
  });
  it('gte / lte / eq sur un nombre latéralisé', () => {
    const s = st({ nums: { 'mobilite.abd_a.D': 90, 'mobilite.abd_a.G': 170 } });
    expect(matches({ key: 'mobilite.abd_a', op: 'lte', value: 100 }, s)).toBe(true);
    expect(matches({ key: 'mobilite.abd_a', op: 'gte', value: 180 }, s)).toBe(false);
    expect(matches({ key: 'mobilite.abd_a', op: 'eq', value: 170 }, s)).toBe(true);
  });
  it('psfs → libellé PSFS', () =>
    expect(
      evaluate(
        {
          ...SHOULDER,
          rules: [{ ...SHOULDER.rules[0]!, kind: 'questionnaire', target: 'psfs', when: { all: [] } }],
        },
        e,
      )[0]!.label,
    ).toBe('PSFS'));
});

describe('valeurs hors bornes déjà stockées', () => {
  it('ignorées par les règles', () => expect(targets(st({ nums: { 'force.re.D': 150 } }))).toEqual([]));
});
