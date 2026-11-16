import { describe, expect, it } from 'vitest';
import { score } from '../src/questionnaires/scoring';

const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i + 1}`);
const fill = (keys: string[], v: number | ((i: number) => number)) =>
  Object.fromEntries(keys.map((k, i) => [k, typeof v === 'function' ? v(i) : v]));

describe('règles de calcul', () => {
  it('NDI / ODI : % sur les sections répondues', () => {
    const s = { kind: 'sections-percent', items: ids('s', 10) } as const;
    expect(score(s, fill(ids('s', 10), 0))!.value).toBe(0);
    expect(score(s, fill(ids('s', 10), 5))!.value).toBe(100);
    // 23 / 50 = 46 %
    expect(
      score(
        s,
        fill(ids('s', 10), (i) => (i < 3 ? 3 : 2)),
      )!.value,
    ).toBe(46);
    const partial = score(s, fill(ids('s', 9), 2))!;
    expect(partial.value).toBe(40);
    expect(partial.note).toMatch(/9 sections sur 10/);
    expect(score(s, {})).toBeNull();
  });

  it('QuickDASH : ((somme/n) − 1) × 25, invalide si > 1 manquante', () => {
    const s = { kind: 'quickdash', items: ids('q', 11) } as const;
    expect(score(s, fill(ids('q', 11), 1))!.value).toBe(0);
    expect(score(s, fill(ids('q', 11), 5))!.value).toBe(100);
    expect(score(s, fill(ids('q', 11), 3))!.value).toBe(50);
    expect(score(s, fill(ids('q', 10), 3))!.valid).toBe(true);
    expect(score(s, fill(ids('q', 9), 3))!.valid).toBe(false);
  });

  it('TSK : items inversés et validité', () => {
    const s = { kind: 'tsk', items: ids('t', 17), reversed: ['t4', 't8', 't12', 't16'] } as const;
    // Tout à 4 : 13 × 4 + 4 × 1 = 56
    expect(score(s, fill(ids('t', 17), 4))!.value).toBe(56);
    // Tout à 1 : 13 × 1 + 4 × 4 = 29
    expect(score(s, fill(ids('t', 17), 1))!.value).toBe(29);
    expect(score(s, fill(ids('t', 16), 1))!.valid).toBe(false);
  });

  it('painDETECT : items + évolution + irradiation, catégories', () => {
    const s = { kind: 'paindetect', items: ids('p', 7), course: 'course', radiation: 'rad' } as const;
    const base = fill(ids('p', 7), 2); // 14
    expect(score(s, { ...base, course: 0, rad: 0 })!.value).toBe(14);
    expect(score(s, { ...base, course: -1, rad: 0 })!.value).toBe(13);
    expect(score(s, { ...base, course: 1, rad: 2 })!.value).toBe(17);
    expect(score(s, { ...fill(ids('p', 7), 0), course: -1, rad: 0 })!.value).toBe(-1);
    expect(score(s, { ...fill(ids('p', 7), 5), course: 1, rad: 2 })!.value).toBe(38);
    expect(score(s, { ...fill(ids('p', 7), 1), course: 0, rad: 2 })!.note).toMatch(/négatif/); // 9
    expect(score(s, { ...fill(ids('p', 7), 2), course: -1, rad: 0 })!.note).toMatch(/incertain/); // 13
    expect(score(s, { ...fill(ids('p', 7), 3), course: 0, rad: 0 })!.note).toMatch(/positif/); // 21
    expect(score(s, base)!.valid).toBe(false);
  });

  it('somme (PCS) : total, sous-échelles, validité', () => {
    const s = {
      kind: 'sum',
      items: ids('c', 13),
      max: 52,
      subscales: [
        { name: 'Rumination', items: ['c8', 'c9', 'c10', 'c11'], max: 16 },
        { name: 'Amplification', items: ['c6', 'c7', 'c13'], max: 12 },
      ],
    } as const;
    const r = score(s, fill(ids('c', 13), 2))!;
    expect([r.value, r.display, r.valid]).toEqual([26, '26 / 52', true]);
    expect(r.parts).toEqual(['Rumination 8 / 16', 'Amplification 6 / 12']);
    expect(score(s, fill(ids('c', 12), 2))!.valid).toBe(false);
  });
});
