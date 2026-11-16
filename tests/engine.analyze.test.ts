import { describe, expect, it } from 'vitest';
import { analyze, disBand, ranks } from '../src/engine/analyze';
import { emptyCase, fromExample, withRegion } from '../src/state/case';
import type { CaseState, Region } from '../src/engine/types';

const lv = (s: CaseState) => {
  const X = analyze(s);
  return Object.fromEntries(([1, 2, 3, 4, 5, 6] as const).map((i) => [i, X.A[i].level]));
};
const withChk = (s: CaseState, ...ids: string[]): CaseState => ({
  ...s,
  chk: { ...s.chk, ...Object.fromEntries(ids.map((i) => [i, true])) },
});

describe('exemples de référence (§6, non-régression)', () => {
  it('cervical « Marie » : 1, 4, 5 (A+B), 6 allumés ; 2 et 3 éteints ; ordre 5,1,6,4,2,3', () => {
    const X = analyze(fromExample('cervical'));
    expect(lv(fromExample('cervical'))).toEqual({ 1: 2, 2: 0, 3: 0, 4: 2, 5: 2, 6: 2 });
    expect(X.A[5].sub).toBe('A+B');
    expect(X.A[1].sub).toBe('A');
    expect(X.order).toEqual([5, 1, 6, 4, 2, 3]);
    expect(ranks(X, 3)).toEqual({ 5: 1, 1: 2, 6: 3 });
  });
  it('lombaire « K.A. » : 1, 2 (A+B), 4, 5 (A+B), 6 (A+B) allumés ; 3 à surveiller ; ordre 5,2,6,4,1,3', () => {
    const X = analyze(fromExample('lumbar'));
    expect(lv(fromExample('lumbar'))).toEqual({ 1: 2, 2: 2, 3: 1, 4: 2, 5: 2, 6: 2 });
    expect([X.A[2].sub, X.A[5].sub, X.A[6].sub]).toEqual(['A+B', 'A+B', 'A+B']);
    expect(X.order).toEqual([5, 2, 6, 4, 1, 3]);
    expect(X.A[2].note).toMatch(/nociplastique probable/);
  });
  it('épaule « P.D. » : 1, 4, 5, 6 allumés ; 2 et 3 éteints ; ordre 5,6,1,4,2,3', () => {
    const X = analyze(fromExample('shoulder'));
    expect(lv(fromExample('shoulder'))).toEqual({ 1: 2, 2: 0, 3: 0, 4: 2, 5: 2, 6: 2 });
    expect(X.order).toEqual([5, 6, 1, 4, 2, 3]);
    expect(X.A[5].note).toMatch(/Épaule/);
  });
});

describe('cas limites', () => {
  it('tous champs vides : aucun volet allumé, ordre 1..6, pas de drapeau', () => {
    for (const r of ['cervical', 'lumbar', 'shoulder'] as Region[]) {
      const X = analyze(emptyCase(r));
      expect(Object.values(X.A).every((a) => a.level === 0 && a.sub === '' && a.refer.length === 0)).toBe(
        true,
      );
      expect(X.order).toEqual([1, 2, 3, 4, 5, 6]);
      expect(X.flags.u).toHaveLength(0);
      expect(X.startRisk).toBe(false);
    }
  });

  it('CSI-9 exactement au seuil (20) = positif ; 19 = négatif', () => {
    const base = emptyCase();
    expect(analyze({ ...base, csi: 20 }).csiPos).toBe(true);
    expect(analyze({ ...base, csi: 20 }).A[2].level).toBe(1);
    expect(analyze({ ...base, csi: 19 }).csiPos).toBe(false);
    expect(analyze({ ...base, csi: 19 }).A[2].level).toBe(0);
    expect(analyze({ ...base, csi: 19 }).A[2].reasons.at(-1)).toMatch(/sous le seuil/);
  });

  it('CSI-25 : seuil 40', () => {
    const base: CaseState = { ...emptyCase(), csiType: 'csi25' };
    expect(analyze({ ...base, csi: 39 }).csiPos).toBe(false);
    expect(analyze({ ...base, csi: 40 }).csiPos).toBe(true);
    expect(analyze({ ...base, csi: 40 }).cut).toBe(40);
  });

  it('CSI positif + un signe clinique = présent', () => {
    expect(analyze(withChk({ ...emptyCase(), csi: 25 }, 'n_reg')).A[2].level).toBe(2);
  });

  it('nociplastique possible (>3 mois + régional + disproportionné) = à surveiller', () => {
    const X = analyze(withChk(emptyCase(), 'n_reg', 'n_disp'));
    expect(X.A[2].level).toBe(1);
    expect(X.A[2].note).toMatch(/possible/);
    const short = analyze(withChk({ ...emptyCase(), duration: '6w3m' }, 'n_reg', 'n_disp'));
    expect(short.A[2].note).toBe('');
    expect(short.A[2].level).toBe(1); // 2 signes parmi 4
  });

  it('sous-volet 2 A+B si STarT élevé, détresse ≥ 7 ou ≥ 3 comorbidités', () => {
    const probable = withChk(emptyCase(), 'n_reg', 'n_disp', 'n_all');
    expect(analyze(probable).A[2].sub).toBe('A');
    expect(analyze({ ...probable, start: 'high' }).A[2].sub).toBe('A+B');
    expect(analyze({ ...probable, sl: { ...probable.sl, dist: 7 } }).A[2].sub).toBe('A+B');
    expect(analyze(withChk(probable, 'co_diab', 'co_thy', 'co_lip')).A[2].sub).toBe('A+B');
    expect(analyze({ ...probable, start: 'high' }).A[2].refer).toHaveLength(1);
  });

  it.each([
    [12, 0],
    [13, 1],
    [18, 1],
    [19, 2],
  ])('painDETECT %i → niveau %i', (pd, level) => {
    expect(analyze({ ...emptyCase(), pd }).A[3].level).toBe(level);
  });

  it('painDETECT : libellés des catégories', () => {
    expect(analyze({ ...emptyCase(), pd: 12 }).A[3].reasons[0]).toMatch(/improbable/);
    expect(analyze({ ...emptyCase(), pd: 13 }).A[3].reasons[0]).toMatch(/ambigu/);
    expect(analyze({ ...emptyCase(), pd: 19 }).A[3].reasons[0]).toMatch(/probable, ≥ 19/);
  });

  it('neuropathique : radiculaire + 2 tests = présent ; signe B = sub B + orientation', () => {
    expect(analyze(withChk(emptyCase(), 'r_rad', 'r_t1')).A[3].level).toBe(1);
    expect(analyze(withChk(emptyCase(), 'r_rad', 'r_t1', 'r_t2')).A[3].level).toBe(2);
    const b = analyze(withChk(emptyCase(), 'r_B'));
    expect([b.A[3].level, b.A[3].sub]).toEqual([2, 'B']);
    expect(b.A[3].refer[0]).toMatch(/myélopathie/);
    const d = analyze(withChk(emptyCase(), 'r_def'));
    expect(d.A[3].sub).toBe('A+B');
    expect(d.A[3].refer[0]).toMatch(/Déficit objectif/);
    const lumbarB = analyze(withChk(emptyCase('lumbar'), 'r_B'));
    expect(lumbarB.A[3].refer[0]).toMatch(/^Déficit neurologique qui progresse/);
  });

  it('épaule : brûlure seule = à surveiller', () => {
    expect(analyze(withChk(emptyCase('shoulder'), 'r_burn')).A[3].level).toBe(1);
  });

  it('nociceptif : absence d’amélioration seule = présent, A+B, orientation', () => {
    const X = analyze(withChk(emptyCase(), 'a_noimp'));
    expect([X.A[1].level, X.A[1].sub, X.A[1].refer.length]).toEqual([2, 'A+B', 1]);
    expect(X.A[1].score).toBe(0);
  });

  it('comorbidités : mal contrôlée seule n’allume pas ; avec une comorbidité = A+B', () => {
    expect(analyze(withChk(emptyCase(), 'co_unc')).A[4].level).toBe(0);
    const X = analyze(withChk(emptyCase(), 'co_unc', 'co_cv'));
    expect([X.A[4].level, X.A[4].sub, X.A[4].refer.length]).toEqual([2, 'A+B', 1]);
  });

  describe('volet 5 : épaule vs autres régions', () => {
    const fearOnly = (r: Region): CaseState => ({ ...emptyCase(r), sl: { ...emptyCase(r).sl, fear: 8 } });
    const expOnly = (r: Region): CaseState => ({ ...emptyCase(r), sl: { ...emptyCase(r).sl, exp: 3 } });

    it('peur seule : à surveiller partout', () => {
      expect(analyze(fearOnly('cervical')).A[5].level).toBe(1);
      expect(analyze(fearOnly('shoulder')).A[5].level).toBe(1);
    });
    it('peur seule + STarT moyen : présent en cervical, à surveiller à l’épaule', () => {
      expect(analyze({ ...fearOnly('cervical'), start: 'medium' }).A[5].level).toBe(2);
      expect(analyze({ ...fearOnly('lumbar'), start: 'medium' }).A[5].level).toBe(2);
      expect(analyze({ ...fearOnly('shoulder'), start: 'medium' }).A[5].level).toBe(1);
    });
    it('attentes faibles seules : présent à l’épaule, à surveiller en cervical', () => {
      expect(analyze(expOnly('shoulder')).A[5].level).toBe(2);
      expect(analyze(expOnly('cervical')).A[5].level).toBe(1);
    });
    it('2 comportements : présent à l’épaule (sub B)', () => {
      const X = analyze(withChk(emptyCase('shoulder'), 'b_avoid', 'b_safety'));
      expect([X.A[5].level, X.A[5].sub]).toEqual([2, 'B']);
      expect(analyze(withChk(emptyCase('shoulder'), 'b_avoid')).A[5].level).toBe(1);
    });
    it('seuils exacts des curseurs (4 / 6)', () => {
      const s = emptyCase();
      expect(analyze({ ...s, sl: { ...s.sl, exp: 4 } }).A[5].level).toBe(1);
      expect(analyze({ ...s, sl: { ...s.sl, exp: 5 } }).A[5].level).toBe(0);
      expect(analyze({ ...s, sl: { ...s.sl, worry: 6 } }).A[5].level).toBe(1);
      expect(analyze({ ...s, sl: { ...s.sl, worry: 5 } }).A[5].level).toBe(0);
    });
    it('orientation si détresse ≥ 8 ou comorbidité humeur', () => {
      const s = emptyCase();
      expect(analyze({ ...s, sl: { ...s.sl, dist: 8 } }).A[5].refer).toHaveLength(1);
      expect(analyze({ ...s, sl: { ...s.sl, dist: 7 } }).A[5].refer).toHaveLength(0);
      expect(analyze(withChk(s, 'co_mood')).A[5].refer).toHaveLength(1);
    });
  });

  it('environnement : un A = à surveiller, deux A = présent, un B = présent (sub B)', () => {
    expect(analyze(withChk(emptyCase(), 'e_load')).A[6].level).toBe(1);
    expect(analyze(withChk(emptyCase(), 'e_load', 'e_phys')).A[6].level).toBe(2);
    const b = analyze(withChk(emptyCase(), 'e_lit'));
    expect([b.A[6].level, b.A[6].sub, b.A[6].refer.length]).toEqual([2, 'B', 1]);
    expect(analyze(withChk(emptyCase(), 'e_lit', 'e_load')).A[6].sub).toBe('A+B');
  });

  it('tri d’égalité : même niveau et même score → numéro croissant', () => {
    // 4 (1 comorbidité, score 1) et 1 (1 marqueur, score 1) : 1 avant 4.
    const X = analyze(withChk(emptyCase(), 'a_mech', 'co_diab'));
    expect(X.order.slice(0, 2)).toEqual([1, 4]);
    // score départage : 4 avec 2 comorbidités passe devant 1.
    expect(analyze(withChk(emptyCase(), 'a_mech', 'co_diab', 'co_cv')).order.slice(0, 2)).toEqual([4, 1]);
  });

  it('drapeaux rouges : u et m triés selon leur type', () => {
    const X = analyze(withChk(emptyCase(), 'x_myel', 'x_cancer'));
    expect(X.flags.u.map((f) => f.id)).toEqual(['x_myel']);
    expect(X.flags.m.map((f) => f.id)).toEqual(['x_cancer']);
  });

  it('changement de région : remet à zéro les cases propres à la région, garde les autres', () => {
    const s = withRegion(fromExample('cervical'), 'shoulder');
    expect(s.chk.a_mech).toBeUndefined();
    expect(s.chk.co_sleep).toBe(true);
    expect(s.instr).toBe('SPADI');
    expect(withRegion({ ...emptyCase('lumbar'), instr: 'RMDQ' }, 'lumbar').instr).toBe('RMDQ');
  });
});

describe('disBand', () => {
  it.each([
    ['NDI', 9, /minimale/],
    ['NDI', 46, /modérée/],
    ['NDI', 66, /majeure/],
    ['ODI', 20, /minimale/],
    ['ODI', 52, /sévère/],
    ['ODI', 81, /maximale/],
    ['SPADI', 48, /Pas de seuils/],
  ])('%s %i', (instr, v, re) => {
    expect(disBand(instr, v)).toMatch(re);
  });
  it('vide si non saisi', () => expect(disBand('NDI', null)).toBe(''));
});
