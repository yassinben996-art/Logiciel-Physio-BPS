/**
 * Rend un texte compatible avec les polices standard de jsPDF (WinAnsi / Latin-1) :
 * remplace la typographie courante, puis supprime tout caractère hors Latin-1.
 */
export function toLatin1(s: string): string {
  return s
    .replace(/[’‘‚‛]/g, "'")
    .replace(/«[\s\u00A0\u202F]*/g, '"')
    .replace(/[\s\u00A0\u202F]*»/g, '"')
    .replace(/[“”„]/g, '"')
    .replace(/→/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[–—−‑]/g, '-')
    .replace(/×/g, 'x')
    .replace(/±/g, '+/-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/[\u202F\u2009\u2007]/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '');
}
