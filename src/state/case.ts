// Fonctions pures de manipulation de l'état du cas (testables sans React).
import { EX } from '../data/examples';
import { REGION } from '../data/regions';
import type { CaseState, Region, Sliders } from '../engine/types';

export const emptySliders = (): Sliders => ({
  exp: null,
  eff: null,
  fear: null,
  worry: null,
  struct: null,
  dist: null,
});

export function emptyCase(region: Region = 'cervical'): CaseState {
  return {
    region,
    label: '',
    duration: 'gt3m',
    onset: 'nontrauma',
    start: 'na',
    pain: null,
    instr: REGION[region].instr[0]!.id,
    dis: null,
    csiType: 'csi9',
    csi: null,
    pd: null,
    chk: {},
    sl: emptySliders(),
    goal: '',
  };
}

export function fromExample(region: Region): CaseState {
  const e = EX[region].state;
  return {
    ...e,
    chk: Object.fromEntries(e.chk.map((k) => [k, true])),
    sl: { ...emptySliders(), ...e.sl },
  };
}

/** Préfixes des cases propres à une région : drapeaux (x_), volet 1 (a_), volet 3 (r_). */
export const REGION_SPECIFIC = /^(x_|a_|r_)/;

/** Changement de région : remet à zéro les cases propres à la région, ajuste l'instrument. */
export function withRegion(s: CaseState, region: Region): CaseState {
  const chk = Object.fromEntries(Object.entries(s.chk).filter(([k]) => !REGION_SPECIFIC.test(k)));
  const instr = REGION[region].instr.some((i) => i.id === s.instr) ? s.instr : REGION[region].instr[0]!.id;
  return { ...s, region, chk, instr };
}

/** Réinitialisation : garde la région et l'instrument courants (comme le prototype). */
export function resetCase(s: CaseState): CaseState {
  return { ...emptyCase(s.region), instr: s.instr };
}
