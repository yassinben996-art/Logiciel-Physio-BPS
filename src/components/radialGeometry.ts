import { DOM } from '../data/domains';

// Géométrie imposée (§7a) : viewBox -70 -30 660 580, centre (260, 262), anneau 166, nœuds 44.
export const CX = 260;
export const CY = 262;
export const RING = 166;
export const RN_ = 44;

export interface NodePos {
  x: number;
  y: number;
  /** Angle en radians, 0 = droite, nœud 1 en haut (−90°). */
  a: number;
}

export const nodePositions = (): NodePos[] =>
  DOM.map((_, i) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return { x: CX + RING * Math.cos(a), y: CY + RING * Math.sin(a), a };
  });

/**
 * Placement de l'étiquette : haut/bas centrés au-dessus/en dessous ; latéraux ancrés à droite/gauche.
 * Mode compact (écran étroit, SVG réduit de moitié) : les latéraux passent au-dessus (haut) ou en dessous (bas) de leur nœud, centrés,
 * pour pouvoir agrandir la police sans sortir du cadre.
 */
export function labelPlacement(p: NodePos, compact = false) {
  const cos = Math.cos(p.a);
  const vertical = Math.abs(cos) < 0.2;
  if (vertical) {
    const above = Math.sin(p.a) < 0;
    return {
      x: p.x,
      y: above ? p.y - RN_ - 14 : p.y + RN_ + (compact ? 30 : 26),
      anchor: 'middle' as const,
      vertical,
      below: !above,
    };
  }
  if (compact) {
    // Nœuds latéraux du haut : étiquette au-dessus ; du bas : en dessous (le centre reste dégagé).
    const up = Math.sin(p.a) < 0;
    return {
      x: p.x,
      y: up ? p.y - RN_ - 14 : p.y + RN_ + 28,
      anchor: 'middle' as const,
      vertical,
      below: !up,
    };
  }
  return {
    x: cos > 0 ? p.x + RN_ + 10 : p.x - RN_ - 10,
    y: p.y + 6,
    anchor: cos > 0 ? ('start' as const) : ('end' as const),
    vertical,
    below: false,
  };
}

/** Coupe une étiquette latérale longue à son trait d'union (« Cognitivo- / affectif »). */
export const splitLabel = (s: string): string[] => {
  const i = s.indexOf('-');
  return s.length > 13 && i > 0 ? [s.slice(0, i + 1), s.slice(i + 1)] : [s];
};
