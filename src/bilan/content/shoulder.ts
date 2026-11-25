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

const choice = (id: string, label: string, options: readonly [string, string][]): FieldDef => ({
  kind: 'choice',
  id,
  label,
  options: options.map(([value, l]) => ({ value, label: l })),
  source: P,
});
const modif = (id: string, label: string): FieldDef =>
  choice(id, label, [
    ['mieux', 'mieux'],
    ['pareil', 'pareil'],
    ['pire', 'pire'],
  ]);
const chips = (id: string, label: string, list: readonly ChipDef[]): FieldDef => ({
  kind: 'chips',
  id,
  label,
  chips: list,
  source: P,
});
const section = (
  id: string,
  title: string,
  fields: readonly FieldDef[],
  sysmeta?: SectionDef['sysmeta'],
): SectionDef => (sysmeta ? { id, title, sysmeta, fields, source: P } : { id, title, fields, source: P });

// Ordre de raisonnement (formations EBPratique et Training Thérapie, document « Bilan de l'épaule ») :
// drapeaux rouges → épaule raide → instable → cervicale → acromio-claviculaire → sous-acromiale par
// élimination → modification des symptômes → porte d'entrée vers le traitement actif.
const sections: readonly SectionDef[] = [
  section(
    'anamnese',
    'Anamnèse',
    [
      chips('signes', 'Signes', [
        chip('nocturne', 'nocturne', ['nuit', 'nocturne', 'réveil']),
        chip('irradiation', 'irradiation', ['irradie', 'irradiation', 'descend']),
        chip('paresthesies', 'paresthésies', ['fourmillement', 'picotement', 'paresthésie']),
        chip('traumatisme', 'traumatisme', ['chute', 'choc', 'trauma']),
        chip('raideur', 'raideur', ['raide', 'raideur', 'bloqué']),
        chip('luxation', 'luxation ou subluxation', ['luxation', 'déboîté', 'sorti', 'subluxation']),
        chip('douleur_post_charge', 'douleur postérieure en charge (pompes, développé)', [
          'pompes',
          'développé',
        ]),
        chip('cervicalgie', 'douleur cervicale associée', ['nuque', 'cou', 'cervical']),
        chip('sous_coude', 'douleur sous le coude', ['avant-bras', 'jusqu’à la main', 'main']),
        chip('debut_repetitif', 'début répétitif (au-dessus de 90°, port de charge)', [
          'répétitif',
          'musculation',
        ]),
        chip('douleur_ac', 'douleur localisée sur l’acromio-claviculaire', ['acromio', 'clavicule']),
      ]),
      choice('irritabilite', 'Irritabilité (approche STAR)', [
        ['elevee', 'élevée'],
        ['moderee', 'modérée'],
        ['faible', 'faible'],
      ]),
      notes(),
    ],
    'Anamnèse',
  ),
  section(
    'drapeaux',
    'Drapeaux',
    [
      chips('rouges', 'Red flags', [
        chip('perte_poids', 'perte de poids inexpliquée', ['perte de poids', 'maigri'], true),
        chip('fievre', 'fièvre', ['fièvre'], true),
        chip('atcd_cancer', 'antécédent de cancer', ['cancer'], true),
        chip('deficit_neuro', 'déficit neurologique', ['faiblesse soudaine', 'paralysie'], true),
      ]),
      chips('jaunes', 'Yellow flags', [
        chip('peur_mvt', 'peur du mouvement', ['peur', 'appréhension']),
        chip('catastrophisme', 'catastrophisme', ['catastrophe', 'jamais guérir']),
      ]),
      notes(),
    ],
    'Red flags / Yellow flags',
  ),
  section(
    'mobilite',
    'Mobilité',
    [
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
    'Bilan articulaire',
  ),
  section(
    'raide',
    '1. Épaule raide ?',
    [
      choice('passif_complet', 'Mobilités passives complètes ?', [
        ['oui', 'oui'],
        ['non', 'non, limitées'],
      ]),
      test('shrug', 'Shrug sign'),
      notes('Notes (capsulite, arthrose, autre)'),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'instable',
    '2. Épaule instable ?',
    [
      test('apprehension', 'Appréhension'),
      test('relocation', 'Relocation'),
      test('surprise', 'Surprise (release)'),
      test('tiroir_ant', 'Tiroir antérieur'),
      test('jerk', 'Jerk test'),
      test('kim', 'Kim test'),
      test('post_impingement', 'Posterior impingement sign'),
      test('sulcus', 'Sulcus'),
      test('gagey', 'Hyperabduction (Gagey)'),
      test('hyper_re', 'Hyper-rotation externe'),
      notes('Notes (sens, mécanisme, laxité, Beighton)'),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'cervical',
    '3. Origine cervicale ?',
    [
      test('modif_rachis', 'Symptômes modifiés en agissant sur le rachis'),
      test('ultt_combines', 'Tests neuro-dynamiques combinés (ULTT)'),
      test('spurling', 'Spurling'),
      test('distraction', 'Distraction cervicale'),
      test('abduction_relief', 'Soulagement en abduction (shoulder abduction relief)'),
      notes('Examen neurologique (moteur, sensibilité, réflexes)'),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'ac',
    '4. Acromio-claviculaire ?',
    [
      chips('cadogan', 'Faisceau de Cadogan (critères présents)', [
        chip('repetitif', 'début répétitif', []),
        chip('pas_sous_coude', 'pas de douleur sous le coude', []),
        chip('ac_epaissie', 'AC épaissie ou gonflée', []),
        chip('abd_passive_indolore', 'abduction passive gléno-humérale non douloureuse', []),
        chip('re_passive_indolore', 'rotation externe passive non douloureuse', []),
      ]),
      test('paxinos', 'Paxinos'),
      test('obrien', 'O’Brien (compression active)'),
      test('cross_body', 'Adduction horizontale (cross-body)'),
      notes(),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'tests',
    '5. Sous-acromial et coiffe',
    [
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
    "Test / Echelle d'évaluation",
  ),
  section(
    'modif',
    '6. Modification des symptômes',
    [
      modif('scap_assist', 'Assistance scapulaire'),
      modif('scap_retraction', 'Rétraction scapulaire'),
      modif('levier_court', 'Bras de levier court (décharge)'),
      modif('activation_coiffe', 'Activation de la coiffe'),
      modif('tilt_post', 'Tilt postérieur (trapèze inférieur)'),
      notes('Mouvement marqueur et effet observé'),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'force',
    'Force',
    [kg('re', 'Rotation externe'), kg('ri', 'Rotation interne'), kg('abd', 'Abduction'), notes()],
    'Bilan musculaire',
  ),
  section('raisonnement', 'Raisonnement', [
    choice('categorie', 'Catégorie retenue', [
      ['raide', 'épaule raide'],
      ['instable', 'épaule instable'],
      ['cervical', 'origine cervicale'],
      ['ac', 'acromio-claviculaire'],
      ['sous_acromial', 'syndrome douloureux sous-acromial'],
      ['persistante', 'douleur persistante'],
    ]),
    notes('Hypothèse principale, diagnostics différentiels, porte d’entrée vers le traitement actif'),
  ]),
  section(
    'plan',
    'Plan',
    [notes('Objectifs, axes de traitement, critères et date du rebilan')],
    'Plan de traitement',
  ),
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
  ...(
    [
      [
        'raideur-shrug',
        'anamnese.signes.raideur',
        'raide.shrug',
        'Raideur rapportée : le shrug sign est sensible pour les raideurs.',
      ],
      [
        'luxation-apprehension',
        'anamnese.signes.luxation',
        'instable.apprehension',
        'Luxation ou subluxation : rechercher une instabilité antérieure.',
      ],
      [
        'luxation-relocation',
        'anamnese.signes.luxation',
        'instable.relocation',
        'Compléter le trio appréhension, relocation, surprise.',
      ],
      [
        'luxation-surprise',
        'anamnese.signes.luxation',
        'instable.surprise',
        'Le surprise test est le test isolé le plus spécifique.',
      ],
      [
        'post-jerk',
        'anamnese.signes.douleur_post_charge',
        'instable.jerk',
        'Douleur postérieure en charge : rechercher une lésion labrale postéro-inférieure.',
      ],
      [
        'post-kim',
        'anamnese.signes.douleur_post_charge',
        'instable.kim',
        'Jerk et Kim combinés sont très sensibles.',
      ],
      [
        'cervicalgie-ultt',
        'anamnese.signes.cervicalgie',
        'cervical.ultt_combines',
        'Douleur cervicale associée : les ULTT combinés négatifs aident à exclure une radiculopathie.',
      ],
      [
        'souscoude-ultt',
        'anamnese.signes.sous_coude',
        'cervical.ultt_combines',
        'Douleur sous le coude : explorer le rachis cervical.',
      ],
      [
        'paresthesies-spurling',
        'anamnese.signes.paresthesies',
        'cervical.spurling',
        'Paresthésies : le Spurling aide à confirmer une radiculopathie.',
      ],
      [
        'ac-paxinos',
        'anamnese.signes.douleur_ac',
        'ac.paxinos',
        'Douleur localisée sur l’AC : un Paxinos négatif aide à exclure.',
      ],
      [
        'repetitif-paxinos',
        'anamnese.signes.debut_repetitif',
        'ac.paxinos',
        'Début répétitif : critère du faisceau de Cadogan, tester l’AC.',
      ],
    ] as const
  ).map(([id, key, target, reason]): RuleDef => ({
    id,
    when: { key, op: 'checked' },
    kind: 'test',
    target,
    reason,
    source: P,
  })),
];

export const SHOULDER: ZoneDef = { id: 'shoulder', label: 'Épaule', sections, rules };
