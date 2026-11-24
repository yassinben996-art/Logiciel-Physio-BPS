import { SHOULDER } from '../src/bilan/content';
import { detectKeywords, normalize } from '../src/bilan/engine/keywords';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';

const e = emptyBilan('shoulder');
const note = (key: string, text: string, p: Partial<BilanState> = {}) =>
  detectKeywords(SHOULDER, { ...e, ...p, notes: { [key]: text } });

describe('mots-clés', () => {
  it('normalize', () => expect(normalize('Réveils FIÈVRE')).toBe('reveils fievre'));
  it('majuscules, pluriel, plusieurs pastilles', () => {
    const h = note('anamnese.notes', 'FOURMILLEMENTS dans les doigts la nuit');
    expect(h.map((x) => x.key)).toEqual(
      expect.arrayContaining(['anamnese.signes.paresthesies', 'anamnese.signes.nocturne']),
    );
    expect(h.every((x) => !x.possiblyNegated)).toBe(true);
    expect(h.find((x) => x.key === 'anamnese.signes.paresthesies')!.matched).toBe('FOURMILLEMENTS');
    expect(h[0]!.note).toBe('anamnese.notes');
  });
  it('singulier', () =>
    expect(note('anamnese.notes', 'un fourmillement').map((x) => x.key)).toContain(
      'anamnese.signes.paresthesies',
    ));
  it('négation', () => {
    const h = note('anamnese.notes', 'pas de fourmillements');
    expect(h).toEqual([
      expect.objectContaining({ key: 'anamnese.signes.paresthesies', possiblyNegated: true }),
    ]);
  });
  it('négation « sans » à 3 mots', () =>
    expect(note('drapeaux.notes', 'sans aucune notion de fièvre')[0]!.possiblyNegated).toBe(true));
  it('négation trop lointaine', () =>
    expect(note('drapeaux.notes', 'pas mal, et puis la fièvre')[0]!.possiblyNegated).toBe(false));
  it('une occurrence affirmée l’emporte sur une niée', () =>
    expect(note('anamnese.notes', 'pas de picotement mais fourmillements')[0]!.possiblyNegated).toBe(false));
  it('accents et pluriel', () =>
    expect(note('anamnese.notes', 'réveils nocturnes').map((x) => x.key)).toContain(
      'anamnese.signes.nocturne',
    ));
  it('préfixe accepté (documenté)', () =>
    expect(note('anamnese.notes', 'nuitamment').map((x) => x.key)).toContain('anamnese.signes.nocturne'));
  it('mot-clé en plusieurs mots, une seule occurrence', () => {
    const h = note('anamnese.notes', 'il a maigri, perte de poids');
    expect(h.filter((x) => x.key === 'drapeaux.rouges.perte_poids')).toHaveLength(1);
  });
  it('pas de correspondance au milieu d’un mot', () =>
    expect(note('anamnese.notes', 'ennuitage').map((x) => x.key)).not.toContain('anamnese.signes.nocturne'));
  it('pastille déjà cochée → absente', () =>
    expect(
      note('anamnese.notes', 'la nuit', { chips: { 'anamnese.signes.nocturne': true } }).map((x) => x.key),
    ).not.toContain('anamnese.signes.nocturne'));
  it('mot-clé refusé → absent', () =>
    expect(
      note('anamnese.notes', 'la nuit', { dismissed: ['kw:anamnese.signes.nocturne'] }).map((x) => x.key),
    ).not.toContain('anamnese.signes.nocturne'));
  it('notes vides → []', () => expect(detectKeywords(SHOULDER, e)).toEqual([]));
  it('la négation ne franchit pas la fin d’une phrase', () => {
    const h = note('anamnese.notes', 'Pas de fièvre. Fourmillements la nuit');
    expect(h.find((x) => x.key === 'anamnese.signes.paresthesies')!.possiblyNegated).toBe(false);
    expect(note('anamnese.notes', 'pas de douleur ; irradiation')[0]!.possiblyNegated).toBe(false);
    expect(note('anamnese.notes', 'pas de douleur\nirradiation')[0]!.possiblyNegated).toBe(false);
  });
});
