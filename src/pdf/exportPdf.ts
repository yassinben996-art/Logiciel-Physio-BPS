// Génération du PDF (A4) avec jsPDF, chargé dynamiquement au clic.
import type { SummaryLine } from '../engine/summary';
import { toLatin1 } from './sanitize';

export const pdfFilename = (d: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `profil-douleur-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.pdf`;
};

export async function exportPdf(lines: SummaryLine[], date: Date = new Date()): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 180;
  const M = 15;
  const BOTTOM = 280;
  let y = M;
  const need = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = M;
    }
  };
  const ink = () => doc.setTextColor(18, 33, 46);
  ink();
  for (const l of lines) {
    const txt = toLatin1(l.s);
    if (l.t === 't') {
      need(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      for (const x of doc.splitTextToSize(txt, W) as string[]) {
        doc.text(x, M, y);
        y += 7;
      }
      y += 2;
    } else if (l.t === 'h') {
      need(14);
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(11, 110, 127);
      for (const x of doc.splitTextToSize(txt, W) as string[]) {
        doc.text(x, M, y);
        y += 5.5;
      }
      ink();
    } else if (l.t === 's') {
      need(9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(txt + ' :', M, y);
      y += 4.5;
    } else {
      doc.setFont('helvetica', l.t === 'n' ? 'italic' : 'normal');
      doc.setFontSize(9);
      if (l.t === 'w') doc.setTextColor(180, 35, 24);
      const li = l.t === 'li';
      for (const x of doc.splitTextToSize(li ? '- ' + txt : txt, li ? W - 4 : W) as string[]) {
        need(5);
        doc.text(x, li ? M + 3 : M, y);
        y += 4.3;
      }
      ink();
      y += li ? 0.8 : 1.5;
    }
  }
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(toLatin1('Aide au raisonnement clinique, non validée'), M, 291);
    doc.text(`page ${p}/${n}`, M + W, 291, { align: 'right' });
  }
  doc.save(pdfFilename(date));
}
