import { describe, expect, it } from 'vitest';
import { SHOULDER } from '../src/bilan/content';
import { evolutionRows, previousValue, seriesColumns } from '../src/bilan/engine/evolution';
import { bilanSummaryLines } from '../src/bilan/engine/exports';
import { emptyBilan, makeRebilan, type BilanState } from '../src/bilan/state/bilan';
import { TSK } from '../src/questionnaires/public';
import { scoreQ } from '../src/questionnaires/scoring';

const at = (b: BilanState, day: string, extra: Partial<BilanState> = {}): BilanState => ({
  ...b,
  createdAt: `${day}T10:00:00.000Z`,
  ...extra,
});
const tskAll = (v: number) => Object.fromEntries(TSK.pages.flatMap((p) => p.items).map((it) => [it.id, v]));

function series(): BilanState[] {
  const b1 = at(emptyBilan('shoulder'), '2026-10-01', {
    nums: { 'mobilite.flex_a.D': 120 },
    tests: { 'tests.neer': 'neg' },
    intake: {
      ...emptyBilan('shoulder').intake,
      answers: { douleur_actuelle: 6, psfs: [{ activity: 'Porter mes courses', score: 3 }] },
    },
    qResults: { tsk: { answers: tskAll(3), at: 'x' } },
  });
  const b2 = at(makeRebilan(b1), '2026-11-01', {
    nums: { 'mobilite.flex_a.D': 150 },
    tests: { 'tests.neer': 'pos' },
    intake: {
      ...emptyBilan('shoulder').intake,
      answers: { douleur_actuelle: 3, psfs: [{ activity: 'porter mes courses ', score: 7 }] },
    },
    qResults: { tsk: { answers: tskAll(2), at: 'x' } },
  });
  return [b2, b1]; // ordre quelconque
}

describe('évolution', () => {
  it('colonnes : chronologiques ; premier + 5 derniers au plus', () => {
    const s = series();
    expect(seriesColumns(s).map((b) => b.createdAt.slice(0, 10))).toEqual(['2026-10-01', '2026-11-01']);
    const many = Array.from({ length: 7 }, (_, i) => at(emptyBilan('shoulder'), `2026-0${i + 1}-01`));
    expect(seriesColumns(many).map((b) => b.createdAt.slice(5, 7))).toEqual([
      '01',
      '03',
      '04',
      '05',
      '06',
      '07',
    ]);
  });
  it('lignes et écarts, sans jugement', () => {
    const rows = evolutionRows(SHOULDER, seriesColumns(series()));
    const row = (label: string) => rows.find((r) => r.label === label);
    expect(row('Flexion active D')).toEqual({
      label: 'Flexion active D',
      values: ['120°', '150°'],
      delta: '+30°',
    });
    expect(row('Flexion active G')).toBeUndefined(); // jamais renseignée
    expect(row('Douleur actuelle (0–10)')?.delta).toBe('−3');
    expect(row('PSFS : Porter mes courses')).toEqual({
      label: 'PSFS : Porter mes courses',
      values: ['3', '7'],
      delta: '+4',
    });
    expect(row('Neer')).toEqual({ label: 'Neer', values: ['négatif', 'positif'] });
    const tsk = rows.find((r) => r.label.startsWith('Questionnaire Tampa'));
    const a = scoreQ(TSK, tskAll(3))!;
    const b = scoreQ(TSK, tskAll(2))!;
    expect(tsk?.values).toEqual([a.display, b.display]);
    const d = b.value - a.value;
    expect(tsk?.delta).toBe(d > 0 ? `+${d}` : `−${-d}`);
  });
  it('valeur du bilan précédent, sans le libellé', () => {
    const [b2, b1] = series();
    void b2;
    const sec = SHOULDER.sections.find((s) => s.id === 'mobilite')!;
    const f = sec.fields.find((x) => x.id === 'flex_a')!;
    expect(previousValue(sec, f, b1)).toBe('D 120°');
    const t = SHOULDER.sections.find((s) => s.id === 'tests')!;
    expect(
      previousValue(
        t,
        t.fields.find((x) => x.id === 'neer')!,
        b1,
      ),
    ).toBe('négatif');
    expect(
      previousValue(
        t,
        t.fields.find((x) => x.id === 'hawkins')!,
        b1,
      ),
    ).toBeNull();
  });
  it('PDF : section Évolution', () => {
    const cols = seriesColumns(series());
    const lines = bilanSummaryLines(SHOULDER, cols[1]!, new Date(), cols);
    const i = lines.findIndex((l) => l.t === 'h' && l.s === 'Évolution');
    expect(i).toBeGreaterThan(-1);
    expect(lines.some((l) => l.t === 'p' && l.s === 'Flexion active D : 120° → 150° (+30°)')).toBe(true);
    expect(lines.some((l) => l.t === 'p' && l.s === 'Bilans : 01.10.2026 → 01.11.2026')).toBe(true);
    expect(bilanSummaryLines(SHOULDER, cols[0]!, new Date()).some((l) => l.s === 'Évolution')).toBe(false);
  });
});
