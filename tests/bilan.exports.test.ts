import { SHOULDER } from '../src/bilan/content';
import { bilanSummaryLines, sysmetaBlocks } from '../src/bilan/engine/exports';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { DISCLAIMER } from '../src/data/text';
import { pdfFilename } from '../src/pdf/exportPdf';

const e = { ...emptyBilan('shoulder'), code: 'B-0042' };
const st = (p: Partial<BilanState>): BilanState => ({ ...e, ...p });
const block = (s: BilanState, rubric: string) =>
  sysmetaBlocks(SHOULDER, s).find((b) => b.rubric === rubric)?.text;
const D = new Date(2026, 10, 24);

describe('blocs SYSmeta', () => {
  it('nombre latéralisé, côtés saisis seulement', () => {
    expect(
      block(st({ nums: { 'mobilite.abd_a.D': 150, 'mobilite.abd_a.G': 170 } }), 'Bilan articulaire'),
    ).toBe('Abduction active : D 150° / G 170°');
    expect(block(st({ nums: { 'mobilite.abd_a.G': 170 } }), 'Bilan articulaire')).toBe(
      'Abduction active : G 170°',
    );
  });
  it('décimales avec virgule et unité kg', () =>
    expect(block(st({ nums: { 'force.re.D': 12.5 } }), 'Bilan musculaire')).toBe(
      'Rotation externe : D 12,5 kg',
    ));
  it('tests', () =>
    expect(
      block(st({ tests: { 'tests.full_can': 'pos', 'tests.neer': 'neg' } }), "Test / Echelle d'évaluation"),
    ).toBe('Full can : positif\nNeer : négatif'));
  it('pastilles cochées', () =>
    expect(
      block(
        st({ chips: { 'anamnese.signes.nocturne': true, 'anamnese.signes.paresthesies': true } }),
        'Anamnèse',
      ),
    ).toBe('Signes : nocturne, paresthésies'));
  it('notes reprises telles quelles', () =>
    expect(
      block(st({ notes: { 'anamnese.notes': 'Douleur depuis 3 mois.\nTravail de bureau.' } }), 'Anamnèse'),
    ).toBe('Douleur depuis 3 mois.\nTravail de bureau.'));
  it('valeur invalide absente', () =>
    expect(sysmetaBlocks(SHOULDER, st({ invalid: { 'mobilite.abd_a.D': true } }))).toEqual([]));
  it('bilan vide → []', () => expect(sysmetaBlocks(SHOULDER, e)).toEqual([]));
  it('sections sans rubrique : seulement dans le PDF', () => {
    const s = st({ notes: { 'raisonnement.notes': 'Tendinopathie probable' } });
    expect(sysmetaBlocks(SHOULDER, s)).toEqual([]);
    expect(bilanSummaryLines(SHOULDER, s, D).map((l) => l.s)).toContain('Tendinopathie probable');
  });
  it('deux sections de même rubrique → un seul bloc', () => {
    const b = sysmetaBlocks(SHOULDER, st({ tests: { 'tests.neer': 'pos', 'modif.scap_assist': 'neg' } }));
    expect(b).toEqual([
      { rubric: "Test / Echelle d'évaluation", text: 'Neer : positif\nAssistance scapulaire : négatif' },
    ]);
  });
  it('identité jamais dans SYSmeta, présente dans le PDF', () => {
    const s = st({
      identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' },
      notes: { 'anamnese.notes': 'x', 'plan.notes': 'y' },
      tests: { 'tests.neer': 'pos' },
    });
    const txt = sysmetaBlocks(SHOULDER, s)
      .map((b) => b.text)
      .join('\n');
    expect(txt).not.toMatch(/Dupont|Marie|1980/);
    expect(bilanSummaryLines(SHOULDER, s, D)).toContainEqual({
      t: 'p',
      s: 'Patient : Marie Dupont, né(e) le 05.03.1980',
    });
  });
});

describe('lignes PDF', () => {
  it('structure', () => {
    const L = bilanSummaryLines(SHOULDER, st({ tests: { 'tests.neer': 'pos' } }), D);
    expect(L[0]).toEqual({ t: 't', s: 'Bilan : Épaule' });
    expect(L.map((l) => l.s)).toEqual(expect.arrayContaining(['Code : B-0042', 'Date : 24.11.2026']));
    expect(L).toContainEqual({ t: 'h', s: 'Tests spécifiques' });
    expect(L).toContainEqual({ t: 'p', s: 'Neer : positif' });
    expect(L.at(-1)).toEqual({ t: 'n', s: DISCLAIMER });
    expect(L.some((l) => l.s.startsWith('Patient'))).toBe(false);
  });
  it('bilan vide', () => {
    const L = bilanSummaryLines(SHOULDER, e, D);
    expect(L.map((l) => l.s)).toContain('Aucune donnée saisie (non renseigné).');
    expect(L.some((l) => l.t === 'h')).toBe(false);
  });
  it('identité partielle', () =>
    expect(
      bilanSummaryLines(SHOULDER, st({ identity: { nom: 'Dupont', prenom: '', naissance: '' } }), D),
    ).toContainEqual({ t: 'p', s: 'Patient : Dupont' }));
  it('nom de fichier', () => {
    expect(pdfFilename(D, 'bilan')).toBe('bilan-2026-11-24.pdf');
    expect(pdfFilename(D)).toBe('profil-douleur-2026-11-24.pdf');
  });
});
