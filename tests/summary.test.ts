import { describe, expect, it } from 'vitest';
import { summaryLines, toText } from '../src/engine/summary';
import { toLatin1 } from '../src/pdf/sanitize';
import { pdfFilename } from '../src/pdf/exportPdf';
import { emptyCase, fromExample } from '../src/state/case';
import { RN } from '../src/data/refs';

const D = new Date(2026, 10, 16);

describe('summaryLines', () => {
  const L = summaryLines(fromExample('lumbar'), D);
  it('en-tête : région, date fr-CH, repère, durée, STarT, douleur, incapacité', () => {
    expect(L[0]).toEqual({ t: 't', s: 'Profil des moteurs de douleur : Lombalgie' });
    expect(L[1]!.s).toBe(
      'Date : 16.11.2026. Repère : K.A. Durée : > 3 mois. STarT MSK : élevé. Douleur 7/10. ODI 52 %.',
    );
  });
  it('objectif du patient', () => {
    expect(L).toContainEqual({
      t: 'p',
      s: 'Objectif du patient : Pouvoir porter mes courses et reprendre mon poste sans crainte.',
    });
  });
  it('volets allumés par priorité, puis Sources et note finale', () => {
    const h = L.filter((l) => l.t === 'h').map((l) => l.s);
    expect(h[0]).toBe('1. Volet 5 Cognitivo-affectif : Présent (A+B)');
    expect(h[1]).toBe('2. Volet 2 Nociplastique : Présent (A+B)');
    expect(h.at(-1)).toBe('Sources');
    expect(h).toHaveLength(7); // 6 volets allumés ou à surveiller + Sources
    expect(L.at(-1)!.t).toBe('n');
    expect(L.at(-1)!.s).toMatch(/non validée/);
  });
  it('interventions avec [niveau de preuve] et numéros de références', () => {
    expect(
      L.some(
        (l) =>
          l.t === 'li' &&
          l.s.startsWith(`Thérapie cognitivo-fonctionnelle (CFT) [Essais ou revues] (${RN.kent23}`),
      ),
    ).toBe(true);
  });
  it('les sources listées sont exactement les références citées', () => {
    const src = L.slice(L.findIndex((l) => l.s === 'Sources') + 1, -1).map((l) => Number(l.s.split('.')[0]));
    const cited = new Set(
      L.filter((l) => l.t === 'li').flatMap((l) =>
        [...l.s.matchAll(/\] \(([\d, ]+)\)/g)].flatMap((m) => m[1]!.split(', ').map(Number)),
      ),
    );
    expect(new Set(src)).toEqual(cited);
  });
  it('orientations incluses', () => {
    expect(L.some((l) => l.s.startsWith('Orienter si : Persistance malgré 6 à 8 semaines'))).toBe(true);
  });
  it('drapeaux : ligne d’alerte', () => {
    const s = { ...emptyCase('lumbar'), chk: { x_cauda: true } };
    expect(summaryLines(s, D)[2]).toEqual({
      t: 'w',
      s: expect.stringMatching(/^Drapeaux : Anesthésie en selle/),
    });
  });
  it('cas vide : repère non renseigné, pas de volet, pas de sources', () => {
    const E = summaryLines(emptyCase(), D);
    expect(E[1]!.s).toMatch(/Repère : non renseigné/);
    expect(E.filter((l) => l.t === 'h')).toHaveLength(0);
    expect(E).toHaveLength(3);
  });
  it('toText : titre en majuscules, puces et sous-titres', () => {
    const t = toText(L);
    expect(t.startsWith('PROFIL DES MOTEURS DE DOULEUR : LOMBALGIE\n')).toBe(true);
    expect(t).toContain('\nCibles :\n- ');
    expect(t).toContain('\n\n1. Volet 5');
  });
});

describe('PDF', () => {
  it('sanitiseur Latin-1 : typographie remplacée, accents conservés', () => {
    expect(toLatin1('l’épaule « abîmée » → ≥ 3 ≤ 4 – −4 × ± œuvre… ✓')).toBe(
      'l\'épaule "abîmée" -> >= 3 <= 4 - -4 x +/- oeuvre... ',
    );
  });
  it('tout le résumé est encodable en Latin-1 après sanitisation', () => {
    for (const r of ['cervical', 'lumbar', 'shoulder'] as const) {
      const txt = toLatin1(toText(summaryLines(fromExample(r), D)));
      expect(/^[\n\x20-\x7E\u00A0-\u00FF]*$/.test(txt)).toBe(true);
      expect(txt).toContain('é');
    }
  });
  it('nom de fichier profil-douleur-AAAA-MM-JJ.pdf', () => {
    expect(pdfFilename(D)).toBe('profil-douleur-2026-11-16.pdf');
  });
});
