import { SHOULDER } from '../src/bilan/content';
import { sectionProgress } from '../src/bilan/engine/progress';
import { emptyBilan } from '../src/bilan/state/bilan';

const mob = SHOULDER.sections.find((s) => s.id === 'mobilite')!;
const e = emptyBilan('shoulder');

describe('sectionProgress', () => {
  it('vide', () => expect(sectionProgress(mob, e)).toEqual({ filled: 0, total: 9 }));
  it('un côté et une note', () =>
    expect(
      sectionProgress(mob, { ...e, nums: { 'mobilite.abd_a.G': 170 }, notes: { 'mobilite.notes': 'x' } }),
    ).toEqual({ filled: 2, total: 9 }));
  it('note blanche ne compte pas', () =>
    expect(sectionProgress(mob, { ...e, notes: { 'mobilite.notes': '   ' } }).filled).toBe(0));
  it('pastilles et tests', () => {
    const anam = SHOULDER.sections[0]!;
    expect(sectionProgress(anam, { ...e, chips: { 'anamnese.signes.nocturne': true } }).filled).toBe(1);
    const t = SHOULDER.sections.find((s) => s.id === 'tests')!;
    expect(sectionProgress(t, { ...e, tests: { 'tests.neer': 'neg' } })).toEqual({ filled: 1, total: 10 });
  });
});
