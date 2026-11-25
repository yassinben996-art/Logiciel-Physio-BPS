// Géométrie du body chart : silhouette et régions invisibles, en polygones (pas de courbes) pour être
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

/** Parties latéralisées, dessinées à gauche de l'image (x < 100) ; l'autre côté est leur miroir. */
const SIDED: readonly { id: string; front: string; back: string; fem: boolean; poly: readonly number[] }[] = [
  {
    id: 'epaule',
    front: 'épaule',
    back: 'épaule',
    fem: true,
    poly: [46, 80, 62, 72, 80, 72, 80, 104, 48, 104],
  },
  { id: 'bras', front: 'bras', back: 'bras', fem: false, poly: [48, 104, 64, 104, 63, 160, 47, 160] },
  { id: 'coude', front: 'coude', back: 'coude', fem: false, poly: [47, 160, 63, 160, 62, 176, 45, 176] },
  {
    id: 'avantbras',
    front: 'avant-bras',
    back: 'avant-bras',
    fem: false,
    poly: [45, 176, 62, 176, 60, 226, 42, 226],
  },
  {
    id: 'main',
    front: 'main',
    back: 'main',
    fem: true,
    poly: [42, 226, 60, 226, 62, 244, 56, 258, 44, 258, 38, 244],
  },
  { id: 'hanche', front: 'hanche', back: 'fesse', fem: true, poly: [66, 200, 100, 200, 100, 236, 70, 236] },
  { id: 'cuisse', front: 'cuisse', back: 'cuisse', fem: true, poly: [70, 236, 100, 236, 98, 310, 74, 310] },
  { id: 'genou', front: 'genou', back: 'genou', fem: false, poly: [74, 310, 98, 310, 97, 330, 75, 330] },
  { id: 'jambe', front: 'jambe', back: 'jambe', fem: true, poly: [75, 330, 97, 330, 95, 392, 78, 392] },
  { id: 'pied', front: 'pied', back: 'pied', fem: false, poly: [78, 392, 95, 392, 98, 412, 70, 412] },
];

/** Parties médianes. */
const CENTER: readonly { id: string; front: string; back: string; poly: readonly number[] }[] = [
  {
    id: 'tete',
    front: 'tête',
    back: 'tête',
    poly: [88, 8, 112, 8, 122, 20, 122, 44, 112, 56, 88, 56, 78, 44, 78, 20],
  },
  { id: 'cou', front: 'cou', back: 'cou', poly: [90, 56, 110, 56, 112, 72, 88, 72] },
  {
    id: 'tronc',
    front: 'thorax',
    back: 'haut du dos',
    poly: [80, 72, 120, 72, 120, 104, 136, 104, 134, 140, 66, 140, 64, 104, 80, 104],
  },
  { id: 'bas', front: 'abdomen', back: 'bas du dos', poly: [66, 140, 134, 140, 134, 200, 66, 200] },
];

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

/** Silhouette : les polygones des régions d'une vue (identique de face et de dos). */
export const SILHOUETTE: readonly (readonly number[])[] = REGIONS.filter((r) => r.view === 'front').map(
  (r) => r.poly,
);

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
