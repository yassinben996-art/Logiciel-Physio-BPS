import { describe, expect, it } from 'vitest';
import { REFS, RN } from '../src/data/refs';
import { REGION } from '../src/data/regions';
import { LIMITS } from '../src/data/text';
import { D2, D4, D4B, D5B, D6, SL } from '../src/data/items';
import { DOM, DESC } from '../src/data/domains';
import { interventions } from '../src/engine/interventions';
import { analyze } from '../src/engine/analyze';
import { emptyCase } from '../src/state/case';
import type { CaseState, DomainId, Region } from '../src/engine/types';

const REGIONS: Region[] = ['cervical', 'lumbar', 'shoulder'];
const IDS: DomainId[] = [1, 2, 3, 4, 5, 6];

/** Toutes les cases cochées : active toutes les branches conditionnelles des interventions. */
function allChecked(region: Region): CaseState {
  const R = REGION[region];
  const chk: Record<string, boolean> = {};
  [...R.flags, ...R.d1, ...R.d3, ...D2, ...D4, D4B, ...D5B, ...D6].forEach((i) => (chk[i.id] = true));
  return { ...emptyCase(region), chk };
}

describe('intégrité des références', () => {
  it('aucune clé dupliquée', () => {
    const keys = REFS.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('chaque URL est https:// ou null', () => {
    REFS.forEach((r) => {
      if (r.url !== null) expect(r.url).toMatch(/^https:\/\//);
    });
  });
  it('aucune URL ne contient de paramètre de suivi', () => {
    REFS.forEach((r) => expect(r.url ?? '').not.toMatch(/utm_/));
  });
  it('RN numérote de 1 à n', () => {
    expect(RN[REFS[0]!.key]).toBe(1);
    expect(Object.keys(RN)).toHaveLength(REFS.length);
  });
  it('toute clé citée par interventions() existe dans REFS', () => {
    const cited = new Set<string>();
    for (const r of REGIONS) {
      for (const s of [emptyCase(r), allChecked(r)]) {
        const X = analyze(s);
        IDS.forEach((id) => interventions(id, s, X).forEach((iv) => iv.r.forEach((k) => cited.add(k))));
      }
    }
    expect(cited.size).toBeGreaterThan(30);
    cited.forEach((k) => expect(RN[k], k).toBeDefined());
  });
  it('toute clé citée par les limites existe dans REFS', () => {
    LIMITS.flatMap((l) => l.refs).forEach((k) => expect(RN[k], k).toBeDefined());
  });
});

describe('intégrité des items', () => {
  it('identifiants uniques dans chaque région', () => {
    for (const r of REGIONS) {
      const R = REGION[r];
      const ids = [...R.flags, ...R.d1, ...R.d3, ...D2, ...D4, D4B, ...D5B, ...D6].map((i) => i.id);
      expect(new Set(ids).size, r).toBe(ids.length);
    }
  });
  it('six volets, six descriptions, six curseurs', () => {
    expect(DOM).toHaveLength(6);
    IDS.forEach((id) => expect(DESC[id]).toBeTruthy());
    expect(SL).toHaveLength(6);
  });
  it('chaque région a ses instruments, drapeaux u et m', () => {
    for (const r of REGIONS) {
      expect(REGION[r].instr.length).toBeGreaterThan(0);
      expect(REGION[r].flags.some((f) => f.kind === 'u')).toBe(true);
      expect(REGION[r].flags.some((f) => f.kind === 'm')).toBe(true);
    }
  });
  it('les libellés de modèle reflètent le niveau de validation', () => {
    expect(REGION.cervical.model).toMatch(/Delphi/);
    expect(REGION.lumbar.model).toMatch(/pilotes/);
    expect(REGION.shoulder.model).toMatch(/non validée/);
  });
});
