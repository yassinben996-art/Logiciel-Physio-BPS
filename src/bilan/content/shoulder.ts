// Contenu PROVISOIRE de l'épaule : il sert à faire tourner la mécanique (saisie, règles, exports).
// Il sera remplacé par la revue de la littérature (spec §5.3). Aucune propriété diagnostique chiffrée
// ici : elles n'arriveront qu'avec une source validée.
// Pour ajouter, retirer ou réordonner une section, un champ, une pastille ou une règle : modifier
// uniquement ce fichier.
import type { ChipDef, FieldDef, RuleDef, SectionDef, Source, ZoneDef } from './types';

const P: Source = {
  ref: 'provisoire — remplacé par la revue de littérature (spec §5.3)',
  added: '2026-11-24',
  provisional: true,
};

const notes = (label = 'Notes'): FieldDef => ({ kind: 'notes', id: 'notes', label, source: P });
const chip = (id: string, label: string, keywords: readonly string[], redFlag?: boolean): ChipDef =>
  redFlag ? { id, label, keywords, redFlag, source: P } : { id, label, keywords, source: P };
const deg = (id: string, label: string): FieldDef => ({
  kind: 'number',
  id,
  label,
  unit: '°',
  min: 0,
  max: 200,
  sided: true,
  source: P,
});
const kg = (id: string, label: string): FieldDef => ({
  kind: 'number',
  id,
  label,
  unit: 'kg',
  min: 0,
  max: 100,
  sided: true,
  source: P,
});
const test = (id: string, label: string): FieldDef => ({ kind: 'test', id, label, source: P });

const sections: readonly SectionDef[] = [
  {
    id: 'anamnese',
    title: 'Anamnèse',
    sysmeta: 'Anamnèse',
    source: P,
    fields: [
      {
        kind: 'chips',
        id: 'signes',
        label: 'Signes',
        source: P,
        chips: [
          chip('nocturne', 'nocturne', ['nuit', 'nocturne', 'réveil']),
          chip('irradiation', 'irradiation', ['irradie', 'irradiation', 'descend']),
          chip('paresthesies', 'paresthésies', ['fourmillement', 'picotement', 'paresthésie']),
          chip('traumatisme', 'traumatisme', ['chute', 'choc', 'trauma']),
          chip('raideur', 'raideur', ['raide', 'raideur', 'bloqué']),
        ],
      },
      notes(),
    ],
  },
  {
    id: 'drapeaux',
    title: 'Drapeaux',
    sysmeta: 'Red flags / Yellow flags',
    source: P,
    fields: [
      {
        kind: 'chips',
        id: 'rouges',
        label: 'Red flags',
        source: P,
        chips: [
          chip('perte_poids', 'perte de poids inexpliquée', ['perte de poids', 'maigri'], true),
          chip('fievre', 'fièvre', ['fièvre'], true),
          chip('atcd_cancer', 'antécédent de cancer', ['cancer'], true),
          chip('deficit_neuro', 'déficit neurologique', ['faiblesse soudaine', 'paralysie'], true),
        ],
      },
      {
        kind: 'chips',
        id: 'jaunes',
        label: 'Yellow flags',
        source: P,
        chips: [
          chip('peur_mvt', 'peur du mouvement', ['peur', 'appréhension']),
          chip('catastrophisme', 'catastrophisme', ['catastrophe', 'jamais guérir']),
        ],
      },
      notes(),
    ],
  },
  {
    id: 'mobilite',
    title: 'Mobilité',
    sysmeta: 'Bilan articulaire',
    source: P,
    fields: [
      deg('flex_a', 'Flexion active'),
      deg('abd_a', 'Abduction active'),
      deg('re1_a', 'Rotation externe (RE1) active'),
      deg('ri_a', 'Rotation interne active'),
      deg('flex_p', 'Flexion passive'),
      deg('abd_p', 'Abduction passive'),
      deg('re1_p', 'Rotation externe (RE1) passive'),
      deg('ri_p', 'Rotation interne passive'),
      notes(),
    ],
  },
  {
    id: 'force',
    title: 'Force',
    sysmeta: 'Bilan musculaire',
    source: P,
    fields: [kg('re', 'Rotation externe'), kg('ri', 'Rotation interne'), kg('abd', 'Abduction'), notes()],
  },
  {
    id: 'tests',
    title: 'Tests spécifiques',
    sysmeta: "Test / Echelle d'évaluation",
    source: P,
    fields: [
      test('full_can', 'Full can'),
      test('empty_can', 'Empty can'),
      test('er_lag', 'ER lag sign'),
      test('ir_lag', 'IR lag sign'),
      test('hawkins', 'Hawkins-Kennedy'),
      test('neer', 'Neer'),
      test('belly_press', 'Belly press'),
      test('lift_off', 'Lift-off'),
      test('drop_arm', 'Drop arm'),
      notes(),
    ],
  },
  {
    id: 'modif',
    title: 'Tests de modification des symptômes',
    sysmeta: "Test / Echelle d'évaluation",
    source: P,
    fields: [
      test('scap_assist', 'Assistance scapulaire'),
      test('scap_retraction', 'Rétraction scapulaire'),
      notes(),
    ],
  },
  {
    id: 'raisonnement',
    title: 'Raisonnement',
    source: P,
    fields: [notes('Hypothèse principale, diagnostics différentiels')],
  },
  {
    id: 'plan',
    title: 'Plan',
    sysmeta: 'Plan de traitement',
    source: P,
    fields: [notes('Objectifs, axes de traitement, critères et date du rebilan')],
  },
];

const rules: readonly RuleDef[] = [
  {
    id: 'fullcan-erlag',
    when: { key: 'tests.full_can', op: 'positive' },
    kind: 'test',
    target: 'tests.er_lag',
    reason: 'Full can positif : vérifier l’intégrité des rotateurs externes.',
    source: P,
  },
  {
    id: 'fullcan-droparm',
    when: { key: 'tests.full_can', op: 'positive' },
    kind: 'test',
    target: 'tests.drop_arm',
    reason: 'Full can positif : compléter le cluster de la coiffe.',
    source: P,
  },
  {
    id: 'force-re-erlag',
    when: { key: 'force.re', op: 'filled' },
    kind: 'test',
    target: 'tests.er_lag',
    reason: 'Force en rotation externe mesurée : compléter par le lag sign.',
    source: P,
  },
  {
    id: 'peur-tsk',
    when: { key: 'drapeaux.jaunes.peur_mvt', op: 'checked' },
    kind: 'questionnaire',
    target: 'tsk',
    reason: 'Peur du mouvement notée : mesurer la kinésiophobie.',
    source: P,
  },
  {
    id: 'catastrophisme-pcs',
    when: { key: 'drapeaux.jaunes.catastrophisme', op: 'checked' },
    kind: 'questionnaire',
    target: 'pcs',
    reason: 'Catastrophisme noté : le mesurer.',
    source: P,
  },
  {
    id: 'nocturne-cancer',
    when: { key: 'anamnese.signes.nocturne', op: 'checked' },
    kind: 'redflag',
    target: 'drapeaux.rouges.atcd_cancer',
    reason: 'Douleur nocturne : vérifier les antécédents de cancer.',
    source: P,
  },
  {
    id: 'duree-csi',
    when: { key: 'accueil.duree', op: 'eq', value: 'gt3m' },
    kind: 'questionnaire',
    target: 'csi',
    reason: 'Douleur depuis plus de 3 mois : dépister une sensibilisation centrale.',
    source: P,
  },
  {
    id: 'fonction-spadi',
    when: { key: 'anamnese.notes', op: 'filled' },
    kind: 'questionnaire',
    target: 'spadi',
    reason: 'Mesure de base de la fonction de l’épaule (questionnaire d’épaule par défaut).',
    source: P,
  },
];

export const SHOULDER: ZoneDef = { id: 'shoulder', label: 'Épaule', sections, rules };
