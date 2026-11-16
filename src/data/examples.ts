// Cas fictifs portés depuis reference/prototype.html (EX).
import type { CaseState, Region, Sliders } from '../engine/types';

export interface Example {
  /** Libellé du bouton. */
  button: string;
  state: Omit<CaseState, 'chk' | 'sl'> & { chk: string[]; sl: Sliders };
}

export const EX: Readonly<Record<Region, Example>> = {
  cervical: {
    button: 'Marie, nuque (webinaire)',
    state: {
      label: 'M.B.',
      region: 'cervical',
      duration: 'gt3m',
      onset: 'nontrauma',
      start: 'medium',
      pain: 6,
      instr: 'NDI',
      dis: 46,
      csiType: 'csi9',
      csi: 14,
      pd: 6,
      chk: ['a_mech', 'a_dp', 'co_sleep', 'b_avoid', 'e_load', 'e_supp', 'e_inact'],
      sl: { exp: 3, eff: 3, fear: 7, worry: 8, struct: 6, dist: 5 },
      goal: 'Reprendre mon travail sans douleur le soir et refaire du sport avec mes enfants.',
    },
  },
  lumbar: {
    button: 'K.A., lombalgie',
    state: {
      label: 'K.A.',
      region: 'lumbar',
      duration: 'gt3m',
      onset: 'nontrauma',
      start: 'high',
      pain: 7,
      instr: 'ODI',
      dis: 52,
      csiType: 'csi9',
      csi: 24,
      pd: 15,
      chk: [
        'a_mech',
        'n_reg',
        'n_disp',
        'n_all',
        'n_sens',
        'co_sleep',
        'co_multi',
        'b_avoid',
        'b_safety',
        'e_phys',
        'e_sick',
        'e_inact',
        'e_sleep',
      ],
      sl: { exp: 4, eff: 3, fear: 8, worry: 7, struct: 8, dist: 7 },
      goal: 'Pouvoir porter mes courses et reprendre mon poste sans crainte.',
    },
  },
  shoulder: {
    button: 'P.D., épaule',
    state: {
      label: 'P.D.',
      region: 'shoulder',
      duration: '6w3m',
      onset: 'nontrauma',
      start: 'medium',
      pain: 5,
      instr: 'SPADI',
      dis: 48,
      csiType: 'csi9',
      csi: 11,
      pd: 5,
      chk: ['a_load', 'e_phys', 'e_load', 'co_diab'],
      sl: { exp: 3, eff: 4, fear: 4, worry: 5, struct: 6, dist: 3 },
      goal: 'Lever le bras au-dessus de la tête pour peindre et dormir sur le côté.',
    },
  },
};
