import { describe, expect, it } from 'vitest';
import { SHOULDER } from '../src/bilan/content';
import { INTAKE } from '../src/bilan/content/intake';
import { buildSummary } from '../src/bilan/ai/summary';
import { bilanSummaryLines, questionnaireLines, sysmetaBlocks } from '../src/bilan/engine/exports';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { QUICKDASH, TSK } from '../src/questionnaires/public';
import { scoreQ } from '../src/questionnaires/scoring';

const qd = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`qd${i + 1}`, 3]));
const withResults = (): BilanState => ({
  ...emptyBilan('shoulder'),
  qResults: {
    quickdash: { answers: qd, at: '2026-11-28T09:00:00.000Z' },
    tsk: { answers: { [TSK.pages[0]!.items[0]!.id]: 2 }, at: '2026-11-28T09:00:00.000Z' },
  },
});

describe('questionnaires à domicile dans les exports', () => {
  it('une ligne par questionnaire, avec le score ; incomplet signalé', () => {
    const l = questionnaireLines(withResults());
    expect(l).toHaveLength(2);
    expect(l[0]).toBe(`${QUICKDASH.name} : ${scoreQ(QUICKDASH, qd)!.display}`);
    expect(l[1]).toMatch(new RegExp(`^${TSK.name.replace(/[()]/g, '\\$&')} : .*incomplet`));
    expect(questionnaireLines(emptyBilan('shoulder'))).toEqual([]);
  });
  it('PDF, SYSmeta et résumé de l’IA', () => {
    const s = withResults();
    const pdf = bilanSummaryLines(SHOULDER, s);
    expect(pdf.some((x) => x.t === 'h' && x.s === 'Questionnaires')).toBe(true);
    const anam = sysmetaBlocks(SHOULDER, s).find((b) => b.rubric === 'Anamnèse');
    expect(anam?.text).toContain('QuickDASH : 50 / 100');
    expect(buildSummary(SHOULDER, s, INTAKE)).toContain('Questionnaires :\n- QuickDASH : 50 / 100');
  });
});
