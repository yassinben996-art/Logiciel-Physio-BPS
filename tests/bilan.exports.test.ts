import { SHOULDER } from '../src/bilan/content';
import { bilanSummaryLines, sysmetaBlocks } from '../src/bilan/engine/exports';
import { intakeLines } from '../src/bilan/engine/intakeText';
import { INTAKE } from '../src/bilan/content/intake';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { DISCLAIMER } from '../src/data/text';
import { pdfFilename, type PdfLine } from '../src/pdf/exportPdf';

const e = { ...emptyBilan('shoulder'), code: 'B-0042' };
const st = (p: Partial<BilanState>): BilanState => ({ ...e, ...p });
const block = (s: BilanState, rubric: string) =>
  sysmetaBlocks(SHOULDER, s).find((b) => b.rubric === rubric)?.text;
const D = new Date(2026, 10, 24);
const txt = (l: PdfLine) => ('s' in l ? l.s : '');

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
    expect(bilanSummaryLines(SHOULDER, s, D).map(txt)).toContain('Tendinopathie probable');
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
    expect(L.map(txt)).toEqual(expect.arrayContaining(['Code : B-0042', 'Date : 24.11.2026']));
    expect(L).toContainEqual({ t: 'h', s: 'Tests spécifiques' });
    expect(L).toContainEqual({ t: 'p', s: 'Neer : positif' });
    expect(L.at(-1)).toEqual({ t: 'n', s: DISCLAIMER });
    expect(L.some((l) => txt(l).startsWith('Patient'))).toBe(false);
  });
  it('bilan vide', () => {
    const L = bilanSummaryLines(SHOULDER, e, D);
    expect(L.map(txt)).toContain('Aucune donnée saisie (non renseigné).');
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

describe('valeurs hors bornes déjà stockées (contenu resserré après coup)', () => {
  it('ignorées par les exports', () => {
    const s = st({ nums: { 'mobilite.abd_a.D': 250, 'mobilite.abd_a.G': 170 } });
    expect(block(s, 'Bilan articulaire')).toBe('Abduction active : G 170°');
    expect(bilanSummaryLines(SHOULDER, s, D).map(txt).join('\n')).not.toContain('250');
  });
});

describe('accueil dans les exports', () => {
  const intakeState = (p: Partial<BilanState['intake']>): BilanState => st({ intake: { ...e.intake, ...p } });
  const chartStrokes = [
    { pen: 'douleur', view: 'front' as const, by: 'patient' as const, pts: [63, 88, 64, 89] },
    { pen: 'fourmillements', view: 'back' as const, by: 'physio' as const, pts: [145, 130, 146, 131] },
  ];
  const sample = intakeState({
    status: 'physio',
    answers: {
      zones: ['shoulder', 'cervical'],
      duree: 'gt3m',
      douleur_actuelle: 6,
      sommeil: 'oui',
      psfs: [
        { activity: 'porter un sac', score: 3 },
        { activity: 's’habiller', score: 5 },
        { activity: '', score: null },
      ],
    },
    original: { douleur_actuelle: 7 },
    strokes: chartStrokes,
  });
  it('intakeLines', () =>
    expect(intakeLines(INTAKE, sample)).toEqual([
      'Accueil : rempli par le physio en séance',
      'Zones douloureuses : L’épaule, La nuque',
      'Durée : Plus de 3 mois',
      'Douleur actuelle (0–10) : 6 (patient : 7)',
      'Douleur : épaule droite (face)',
      'Fourmillements : bras droit (dos)',
      'PSFS : porter un sac 3/10 ; s’habiller 5/10',
      'Sommeil perturbé par la douleur : oui',
    ]));
  it('date si rempli par le patient', () =>
    expect(
      intakeLines(
        INTAKE,
        intakeState({
          status: 'patient',
          patientAt: '2026-11-25T08:00:00.000Z',
          answers: { douleur_actuelle: 4 },
        }),
      )[0],
    ).toBe('Accueil : rempli par le patient le 25.11.2026'));
  it('accueil vide → aucune ligne', () => expect(intakeLines(INTAKE, e)).toEqual([]));
  it('bloc Anamnèse commence par l’accueil, sans identité', () => {
    const s = { ...sample, identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' } };
    const b = sysmetaBlocks(SHOULDER, s).find((x) => x.rubric === 'Anamnèse')!;
    expect(b.text.split('\n')[0]).toBe('Accueil : rempli par le physio en séance');
    expect(
      sysmetaBlocks(SHOULDER, s)
        .map((x) => x.text)
        .join('\n'),
    ).not.toMatch(/Dupont|Marie/);
  });
  it('PDF : section Accueil puis le dessin', () => {
    const L = bilanSummaryLines(SHOULDER, sample, D);
    const h = L.findIndex((l) => l.t === 'h' && 's' in l && l.s === 'Accueil');
    expect(h).toBeGreaterThan(0);
    const chart = L.findIndex((l) => l.t === 'chart');
    expect(chart).toBe(h + 1 + intakeLines(INTAKE, sample).length);
    const c = L[chart]!;
    expect(c.t === 'chart' && c.strokes).toHaveLength(2);
  });
  it('PDF sans trait : pas de dessin', () =>
    expect(
      bilanSummaryLines(
        SHOULDER,
        intakeState({ answers: { douleur_actuelle: 3 }, status: 'physio' }),
        D,
      ).some((l) => l.t === 'chart'),
    ).toBe(false));

  it('côté ignoré si l’épaule n’est plus cochée', () => {
    const s = intakeState({ status: 'physio', answers: { zones: ['cervical'], cote: 'droite' } });
    expect(intakeLines(INTAKE, s).join('\n')).not.toContain('Côté');
  });
});
