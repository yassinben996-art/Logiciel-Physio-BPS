// Zones du body chart. Chaque zone est un rectangle arrondi d'une silhouette schématique
// (viewBox 120 × 245 par vue). Côtés D/G du point de vue du patient : sur la vue de face, la droite
// du patient est à gauche de l'écran ; sur la vue de dos, elle est à droite.
// Pour ajouter ou déplacer une zone : modifier uniquement cette liste.

export type BodyView = 'face' | 'dos';
export interface BodyRegion {
  id: string;
  label: string;
  view: BodyView;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Shape = [x: number, y: number, w: number, h: number];

const one = (view: BodyView, id: string, label: string, [x, y, w, h]: Shape): BodyRegion => ({
  id,
  label,
  view,
  x,
  y,
  w,
  h,
});

/** Paire droite/gauche. `left` = rectangle à gauche de l'écran. */
function pair(view: BodyView, id: string, label: string, left: Shape): BodyRegion[] {
  const [x, y, w, h] = left;
  const right: Shape = [120 - x - w, y, w, h];
  // Face : gauche de l'écran = droite du patient. Dos : gauche de l'écran = gauche du patient.
  const [d, g] = view === 'face' ? [left, right] : [right, left];
  return [one(view, `${id}_d`, `${label} droit(e)`, d), one(view, `${id}_g`, `${label} gauche`, g)];
}

const face: BodyRegion[] = [
  one('face', 'tete', 'Tête, visage', [48, 3, 24, 30]),
  one('face', 'cou', 'Cou (devant)', [53, 33, 14, 8]),
  ...pair('face', 'epaule', 'Épaule', [30, 40, 16, 14]),
  one('face', 'thorax', 'Thorax', [46, 42, 28, 34]),
  one('face', 'abdomen', 'Ventre', [46, 77, 28, 30]),
  ...pair('face', 'bras', 'Bras', [26, 55, 13, 30]),
  ...pair('face', 'coude', 'Coude', [24, 86, 13, 10]),
  ...pair('face', 'avant_bras', 'Avant-bras', [20, 97, 13, 30]),
  ...pair('face', 'main', 'Main, poignet', [16, 128, 14, 16]),
  ...pair('face', 'aine', 'Aine, hanche', [45, 108, 14, 16]),
  ...pair('face', 'cuisse', 'Cuisse (devant)', [44, 125, 15, 40]),
  ...pair('face', 'genou', 'Genou (devant)', [44, 166, 15, 14]),
  ...pair('face', 'jambe', 'Jambe (devant)', [45, 181, 13, 44]),
  ...pair('face', 'pied', 'Pied, cheville', [43, 226, 15, 14]),
];

const dos: BodyRegion[] = [
  one('dos', 'arriere_tete', 'Arrière de la tête', [48, 3, 24, 30]),
  one('dos', 'nuque', 'Nuque', [53, 33, 14, 8]),
  ...pair('dos', 'omoplate', 'Épaule, omoplate', [30, 40, 16, 14]),
  one('dos', 'haut_dos', 'Haut du dos', [46, 42, 28, 34]),
  one('dos', 'bas_dos', 'Bas du dos', [46, 77, 28, 30]),
  ...pair('dos', 'bras_dos', 'Bras (arrière)', [26, 55, 13, 30]),
  ...pair('dos', 'coude_dos', 'Coude (arrière)', [24, 86, 13, 10]),
  ...pair('dos', 'avant_bras_dos', 'Avant-bras (arrière)', [20, 97, 13, 30]),
  ...pair('dos', 'main_dos', 'Dos de la main', [16, 128, 14, 16]),
  ...pair('dos', 'fesse', 'Fesse', [45, 108, 14, 16]),
  ...pair('dos', 'cuisse_dos', 'Cuisse (arrière)', [44, 125, 15, 40]),
  ...pair('dos', 'creux_genou', 'Creux du genou', [44, 166, 15, 14]),
  ...pair('dos', 'mollet', 'Mollet', [45, 181, 13, 44]),
  ...pair('dos', 'talon', 'Talon', [43, 226, 15, 14]),
];

export const BODY_REGIONS: readonly BodyRegion[] = [...face, ...dos];
export const BODY_REGION_IDS: ReadonlySet<string> = new Set(BODY_REGIONS.map((r) => r.id));
