// Body chart dans le PDF : les deux silhouettes, les traits et la légende des crayons utilisés.
import type { jsPDF } from 'jspdf';
import { DETAILS, SILHOUETTE, VIEW_H, VIEW_W } from '../bilan/bodychart/geometry';
import type { PdfLine } from './exportPdf';
import { toLatin1 } from './sanitize';

type ChartLine = Extract<PdfLine, { t: 'chart' }>;

const GAP = 8;
const MAX_VIEW_W = 55; // mm : deux vues lisibles sans occuper toute la page
const LEGEND_H = 6;

const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

const viewWidth = (w: number) => Math.min(MAX_VIEW_W, (w - GAP) / 2);

/** Hauteur occupée (mm), pour décider d'un saut de page. */
export function chartHeight(w: number): number {
  return (viewWidth(w) * VIEW_H) / VIEW_W + 5 + LEGEND_H;
}

function path(
  doc: jsPDF,
  pts: readonly number[],
  ox: number,
  oy: number,
  k: number,
  closed: boolean,
  style: 'S' | 'FD',
) {
  if (pts.length < 4) return;
  const deltas: [number, number][] = [];
  for (let i = 2; i + 1 < pts.length; i += 2)
    deltas.push([(pts[i]! - pts[i - 2]!) * k, (pts[i + 1]! - pts[i - 1]!) * k]);
  doc.lines(deltas, ox + pts[0]! * k, oy + pts[1]! * k, [1, 1], style, closed);
}

/** Dessine le body chart à partir de (x, y) sur la largeur w ; renvoie la hauteur occupée (mm). */
export function drawBodyChart(doc: jsPDF, x: number, y: number, w: number, line: ChartLine): number {
  const vw = viewWidth(w);
  const k = vw / VIEW_W;
  const vh = VIEW_H * k;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  (['front', 'back'] as const).forEach((view, n) => {
    const ox = x + n * (vw + GAP);
    doc.text(toLatin1(view === 'front' ? 'Face (D à gauche)' : 'Dos (D à droite)'), ox + vw / 2, y + 3, {
      align: 'center',
    });
    const oy = y + 5;
    doc.setDrawColor(138, 155, 166);
    doc.setFillColor(238, 241, 243);
    doc.setLineWidth(0.35);
    for (const poly of SILHOUETTE) path(doc, poly, ox, oy, k, true, 'FD');
    doc.setDrawColor(181, 193, 201);
    doc.setLineWidth(0.25);
    for (const d of DETAILS[view]) path(doc, d, ox, oy, k, false, 'S');
    doc.setLineWidth(1.2);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    for (const s of line.strokes) {
      if (s.view !== view) continue;
      doc.setDrawColor(...rgb(line.pens.find((p) => p.id === s.pen)?.color ?? '#555555'));
      path(doc, s.pts, ox, oy, k, false, 'S');
    }
  });
  // Légende des crayons utilisés.
  const used = line.pens.filter((p) => line.strokes.some((s) => s.pen === p.id));
  let lx = x;
  const ly = y + 5 + vh + 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (const p of used) {
    doc.setFillColor(...rgb(p.color));
    doc.rect(lx, ly - 2.5, 3, 3, 'F');
    doc.setTextColor(40, 40, 40);
    const label = toLatin1(p.label);
    doc.text(label, lx + 4.5, ly);
    lx += 4.5 + doc.getTextWidth(label) + 6;
  }
  doc.setLineWidth(0.2);
  return 5 + vh + LEGEND_H;
}
