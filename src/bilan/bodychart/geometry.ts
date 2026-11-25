// Géométrie du body chart : silhouette (contour lisse échantillonné en polygone) et régions invisibles,
// tracées à l'identique en SVG et dans le PDF. Repère de chaque vue : 200 × 420.
// Convention : de FACE, le côté droit du patient est à GAUCHE de l'image ; de DOS, il est à DROITE.

export type View = 'front' | 'back';
export const VIEW_W = 200;
export const VIEW_H = 420;

export interface Stroke {
  pen: string;
  view: View;
  by: 'patient' | 'physio';
  /** x0, y0, x1, y1… dans le repère de la vue, arrondis à 0,1. */
  pts: readonly number[];
}

export interface Region {
  id: string;
  label: string;
  view: View;
  /** x0, y0, x1, y1… (fermé implicitement). */
  poly: readonly number[];
}

/** Parties latéralisées, découpées à gauche de l'image (x < 100) ; l'autre côté est leur miroir. */
const SIDED: readonly { id: string; front: string; back: string; fem: boolean; poly: readonly number[] }[] = [
  { id: 'epaule', front: 'épaule', back: 'épaule', fem: true, poly: [36, 84, 84, 78, 84, 118, 30, 118] },
  { id: 'bras', front: 'bras', back: 'bras', fem: false, poly: [20, 118, 67, 118, 67, 180, 18, 180] },
  { id: 'coude', front: 'coude', back: 'coude', fem: false, poly: [18, 180, 67, 180, 62, 200, 16, 200] },
  {
    id: 'avantbras',
    front: 'avant-bras',
    back: 'avant-bras',
    fem: false,
    poly: [16, 200, 62, 200, 62, 238, 14, 238],
  },
  { id: 'main', front: 'main', back: 'main', fem: true, poly: [14, 238, 62, 238, 62, 296, 10, 296] },
  { id: 'hanche', front: 'hanche', back: 'fesse', fem: true, poly: [62, 215, 100, 215, 100, 258, 62, 258] },
  { id: 'cuisse', front: 'cuisse', back: 'cuisse', fem: true, poly: [62, 258, 100, 258, 100, 308, 62, 308] },
  { id: 'genou', front: 'genou', back: 'genou', fem: false, poly: [62, 308, 100, 308, 100, 332, 62, 332] },
  { id: 'jambe', front: 'jambe', back: 'jambe', fem: true, poly: [62, 332, 100, 332, 100, 390, 62, 390] },
  { id: 'pied', front: 'pied', back: 'pied', fem: false, poly: [56, 390, 100, 390, 100, 420, 56, 420] },
];

/** Parties médianes. */
const CENTER: readonly { id: string; front: string; back: string; poly: readonly number[] }[] = [
  { id: 'tete', front: 'tête', back: 'tête', poly: [64, 0, 136, 0, 136, 62, 64, 62] },
  { id: 'cou', front: 'cou', back: 'cou', poly: [84, 62, 116, 62, 116, 78, 84, 78] },
  {
    id: 'tronc',
    front: 'thorax',
    back: 'haut du dos',
    poly: [84, 78, 116, 78, 116, 118, 133, 118, 133, 165, 67, 165, 67, 118, 84, 118],
  },
  { id: 'bas', front: 'abdomen', back: 'bas du dos', poly: [67, 165, 133, 165, 133, 215, 67, 215] },
];

/** Lissage Catmull-Rom : n points par segment. */
function smooth(pts: readonly (readonly [number, number])[], n: number, closed: boolean): number[] {
  const out: number[] = [];
  const len = pts.length;
  const P = (i: number) => pts[closed ? (i + len) % len : Math.max(0, Math.min(len - 1, i))]!;
  const last = closed ? len : len - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const steps = !closed && i === last - 1 ? n + 1 : n;
    for (let k = 0; k < steps; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push(
        Math.round(f(p0[0], p1[0], p2[0], p3[0]) * 10) / 10,
        Math.round(f(p0[1], p1[1], p2[1], p3[1]) * 10) / 10,
      );
    }
  }
  return out;
}

/** Demi-contour (gauche de l'image), du sommet du crâne à l'entrejambe ; dessin original. */
const HALF: readonly (readonly [number, number])[] = [
  // tête et cou
  [100, 15],
  [91, 17],
  [85, 24],
  [83, 34],
  [84, 45],
  [87, 53],
  [92, 59],
  [94, 63],
  [93, 70],
  [90, 76],
  // épaule
  [80, 80],
  [70, 84],
  [62, 89],
  [56, 97],
  // bras, bord externe (épaisseur régulière, environ 14)
  [53, 108],
  [51, 122],
  [50, 138],
  [49, 154],
  [48, 170],
  [47, 184],
  [45, 198],
  [43, 214],
  [41, 230],
  [40, 240],
  // main sans doigts
  [36, 246],
  [32, 254],
  [30, 262],
  [32, 270],
  [36, 277],
  [42, 281],
  [47, 279],
  [50, 272],
  [51, 262],
  [50, 252],
  [50, 244],
  // bras, bord interne jusqu'à l'aisselle
  [53, 234],
  [56, 220],
  [58, 204],
  [60, 190],
  [61, 176],
  [62, 160],
  [63, 144],
  [65, 130],
  // flanc et hanche
  [69, 140],
  [71, 156],
  [72, 172],
  [71, 188],
  [69, 202],
  [67, 216],
  [66, 232],
  // cuisse, genou, jambe (bord externe)
  [68, 252],
  [71, 272],
  [73, 292],
  [74, 310],
  [74, 322],
  [73, 336],
  [73, 352],
  [75, 368],
  [77, 384],
  // pied
  [78, 394],
  [75, 402],
  [76, 408],
  [83, 411],
  [91, 410],
  [94, 405],
  [93, 396],
  [94, 384],
  // jambe, genou, cuisse (bord interne) jusqu'à l'entrejambe
  [95, 368],
  [96, 350],
  [96, 332],
  [97, 316],
  [97, 298],
  [97, 278],
  [98, 262],
  [100, 250],
];

const OUTLINE: readonly number[] = smooth(
  [
    ...HALF,
    ...HALF.slice(1, -1)
      .reverse()
      .map(([x, y]) => [VIEW_W - x, y] as const),
  ],
  5,
  true,
);

/** Repères anatomiques discrets (traits ouverts), propres à chaque vue. */
const line = (...p: [number, number][]) => smooth(p, 5, false);
export const DETAILS: Readonly<Record<View, readonly (readonly number[])[]>> = {
  front: [
    line([78, 92], [88, 96], [96, 95]),
    line([122, 92], [112, 96], [104, 95]),
    line([72, 128], [84, 134], [96, 132]),
    line([128, 128], [116, 134], [104, 132]),
    line([100, 189], [100, 192]),
    line([84, 244], [94, 250], [98, 250]),
    line([116, 244], [106, 250], [102, 250]),
    line([82, 318], [88, 322]),
    line([118, 318], [112, 322]),
  ],
  back: [
    line([100, 84], [100, 200]),
    line([80, 104], [84, 122], [90, 132]),
    line([120, 104], [116, 122], [110, 132]),
    line([72, 240], [86, 250], [100, 246]),
    line([128, 240], [114, 250], [100, 246]),
    line([82, 326], [88, 324]),
    line([118, 326], [112, 324]),
  ],
};

const mirror = (poly: readonly number[]) => poly.map((v, i) => (i % 2 === 0 ? VIEW_W - v : v));
const VIEW_LABEL: Record<View, string> = { front: 'face', back: 'dos' };

function build(): Region[] {
  const out: Region[] = [];
  for (const view of ['front', 'back'] as const) {
    for (const c of CENTER)
      out.push({ id: `${view}-${c.id}`, label: `${c[view]} (${VIEW_LABEL[view]})`, view, poly: c.poly });
    for (const p of SIDED) {
      const name = p[view];
      // Côté dessiné à gauche de l'image : droite du patient de face, gauche de dos.
      const leftSide = view === 'front' ? 'd' : 'g';
      for (const side of ['d', 'g'] as const) {
        const word = side === 'g' ? 'gauche' : p.fem ? 'droite' : 'droit';
        out.push({
          id: `${view}-${p.id}-${side}`,
          label: `${name} ${word} (${VIEW_LABEL[view]})`,
          view,
          poly: side === leftSide ? p.poly : mirror(p.poly),
        });
      }
    }
  }
  return out;
}

export const REGIONS: readonly Region[] = build();

/** Silhouette : un contour lisse (polygone dense), identique de face et de dos. */
export const SILHOUETTE: readonly (readonly number[])[] = [OUTLINE];

/** Test du rayon (pair-impair). */
export function pointInPolygon(x: number, y: number, poly: readonly number[]): boolean {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[2 * i]!;
    const yi = poly[2 * i + 1]!;
    const xj = poly[2 * j]!;
    const yj = poly[2 * j + 1]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Régions touchées par au moins un point d'un trait (de la bonne vue), dans l'ordre de REGIONS. */
export function regionsOf(strokes: readonly Stroke[], pen?: string): Region[] {
  const used = strokes.filter((s) => pen === undefined || s.pen === pen);
  return REGIONS.filter((r) =>
    used.some((s) => {
      if (s.view !== r.view) return false;
      for (let i = 0; i + 1 < s.pts.length; i += 2)
        if (pointInPolygon(s.pts[i]!, s.pts[i + 1]!, r.poly)) return true;
      return false;
    }),
  );
}
