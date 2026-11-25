// Contenu PROVISOIRE du genou, tiré du document « Bilan du genou » (CPG JOSPT ligament 2017,
// ménisque et cartilage 2018, SFP 2019 ; NICE NG226). Aucune propriété diagnostique chiffrée ici :
// elles n'arriveront qu'avec une source validée par Yass.
// Pour ajouter, retirer ou réordonner une section, un champ, une pastille ou une règle : modifier
// uniquement ce fichier.
import type { ChipDef, FieldDef, RuleDef, SectionDef, Source, ZoneDef } from './types';

const P: Source = {
  ref: 'provisoire — document « Bilan du genou » du 25.11.2026, à valider',
  added: '2026-11-25',
  provisional: true,
};

const notes = (label = 'Notes'): FieldDef => ({ kind: 'notes', id: 'notes', label, source: P });
const chip = (id: string, label: string, keywords: readonly string[], redFlag?: boolean): ChipDef =>
  redFlag ? { id, label, keywords, redFlag, source: P } : { id, label, keywords, source: P };
const num = (id: string, label: string, unit: string, max: number): FieldDef => ({
  kind: 'number',
  id,
  label,
  unit,
  min: 0,
  max,
  sided: true,
  source: P,
});
const test = (id: string, label: string): FieldDef => ({ kind: 'test', id, label, source: P });
const section = (
  id: string,
  title: string,
  fields: FieldDef[],
  sysmeta?: SectionDef['sysmeta'],
): SectionDef => (sysmeta ? { id, title, sysmeta, fields, source: P } : { id, title, fields, source: P });

const sections: readonly SectionDef[] = [
  section(
    'anamnese',
    'Anamnèse',
    [
      {
        kind: 'chips',
        id: 'mecanisme',
        label: 'Mécanisme',
        source: P,
        chips: [
          chip('torsion', 'torsion ou pivot', ['torsion', 'pivot', 'tourné', 'vrillé']),
          chip('choc', 'choc direct', ['choc', 'coup', 'tableau de bord', 'chute sur le genou']),
          chip('hyperext', 'hyperextension', ['hyperextension']),
          chip('insidieux', 'début insidieux', ['progressif', 'petit à petit', 'sans raison']),
        ],
      },
      {
        kind: 'chips',
        id: 'signes',
        label: 'Signes',
        source: P,
        chips: [
          chip('epanch_rapide', 'épanchement en 0 à 2 h', ['gonflé tout de suite', 'gonflement immédiat']),
          chip('epanch_retarde', 'épanchement retardé (6 à 24 h)', ['gonflé le lendemain', 'gonflé le soir']),
          chip('blocage', 'accrochages ou blocages', ['bloque', 'blocage', 'accroche', 'coince']),
          chip('derobement', 'dérobements', ['lâche', 'dérobe', 'dérobement', 'instable']),
          chip('pop', '« pop » au traumatisme', ['pop', 'craquement', 'claquement']),
          chip('douleur_ant', 'douleur antérieure (autour de la rotule)', ['rotule', 'devant le genou']),
          chip('raideur_mat', 'raideur matinale ≤ 30 min', ['raide le matin', 'dérouillage']),
        ],
      },
      notes('Notes d’anamnèse'),
    ],
    'Anamnèse',
  ),
  section(
    'drapeaux',
    'Drapeaux',
    [
      {
        kind: 'chips',
        id: 'ottawa',
        label: 'Ottawa knee rule (après un traumatisme)',
        source: P,
        chips: [
          chip('age55', 'âge ≥ 55 ans', [], true),
          chip('fibula', 'douleur à la tête de la fibula', [], true),
          chip('rotule', 'douleur isolée de la rotule', [], true),
          chip('flex90', 'flexion < 90°', [], true),
          chip('appui', 'incapable de faire 4 pas', [], true),
        ],
      },
      {
        kind: 'chips',
        id: 'rouges',
        label: 'Autres drapeaux rouges',
        source: P,
        chips: [
          chip('septique', 'genou chaud et gonflé avec fièvre', ['fièvre', 'frissons'], true),
          chip(
            'chir_prothese',
            'chirurgie récente ou prothèse du genou',
            ['prothèse', 'opéré récemment'],
            true,
          ),
          chip('tvp', 'mollet douloureux et gonflé', ['mollet'], true),
          chip('cancer', 'antécédent de cancer, perte de poids', ['cancer', 'perte de poids'], true),
          chip('blocage_vrai', 'blocage vrai irréductible', ['bloqué en flexion'], true),
          chip('luxation', 'luxation du genou, déficit neurovasculaire', ['luxation'], true),
        ],
      },
      {
        kind: 'chips',
        id: 'jaunes',
        label: 'Drapeaux jaunes',
        source: P,
        chips: [
          chip('peur_mvt', 'peur du mouvement ou de la récidive', ['peur', 'appréhension']),
          chip('catastrophisme', 'catastrophisme', ['catastrophe', 'jamais guérir']),
        ],
      },
      notes(),
    ],
    'Red flags / Yellow flags',
  ),
  section(
    'epanchement',
    'Épanchement',
    [
      {
        kind: 'choice',
        id: 'stroke',
        label: 'Stroke test modifié',
        source: P,
        options: [
          { value: 'zero', label: 'zéro' },
          { value: 'trace', label: 'trace' },
          { value: '1+', label: '1+' },
          { value: '2+', label: '2+' },
          { value: '3+', label: '3+' },
        ],
      },
      notes(),
    ],
    'Bilan articulaire',
  ),
  section(
    'mobilite',
    'Mobilité',
    [
      num('flex_a', 'Flexion active', '°', 170),
      num('ext_a', 'Déficit d’extension active', '°', 60),
      num('flex_p', 'Flexion passive', '°', 170),
      num('ext_p', 'Déficit d’extension passive', '°', 60),
      notes(),
    ],
    'Bilan articulaire',
  ),
  section(
    'force',
    'Force',
    [
      num('quadri', 'Quadriceps (isométrique)', 'kg', 150),
      num('ischios', 'Ischio-jambiers', 'kg', 150),
      notes(),
    ],
    'Bilan musculaire',
  ),
  section(
    'performance',
    'Performance',
    [
      num('single_hop', 'Single hop for distance', 'cm', 400),
      num('triple_hop', 'Triple hop for distance', 'cm', 1200),
      num('crossover_hop', 'Crossover hop for distance', 'cm', 1200),
      num('timed_6m', '6 m chronométré', 's', 30),
      notes(),
    ],
    "Test / Echelle d'évaluation",
  ),
  section(
    'tests',
    'Tests cliniques',
    [
      test('lachman', 'Lachman'),
      test('tiroir_ant', 'Tiroir antérieur'),
      test('pivot_shift', 'Pivot shift'),
      test('lever_sign', 'Lever sign'),
      test('tiroir_post', 'Tiroir postérieur'),
      test('sag', 'Avalement postérieur (posterior sag)'),
      test('valgus30', 'Stress en valgus à 30°'),
      test('varus', 'Stress en varus à 0° et 30°'),
      test('mcmurray', 'McMurray'),
      test('interligne', 'Douleur à l’interligne'),
      test('thessaly', 'Thessaly à 20°'),
      test('hyperext', 'Douleur en hyperextension forcée'),
      test('flex_max', 'Douleur en flexion passive maximale'),
      test('squat_pfp', 'Douleur rétro- ou péripatellaire au squat'),
      test('tilt', 'Inclinaison patellaire (hypomobilité)'),
      test('apprehension', 'Appréhension patellaire'),
      test('tendon_palp', 'Palpation du tendon patellaire'),
      test('decline_squat', 'Squat unipodal sur plan incliné'),
      notes(),
    ],
    "Test / Echelle d'évaluation",
  ),
  section('raisonnement', 'Raisonnement clinique', [notes()]),
  section('plan', 'Plan de traitement', [notes()], 'Plan de traitement'),
];

const rule = (
  id: string,
  when: RuleDef['when'],
  kind: RuleDef['kind'],
  target: string,
  reason: string,
): RuleDef => ({
  id,
  when,
  kind,
  target,
  reason,
  source: P,
});

const rules: readonly RuleDef[] = [
  rule(
    'torsion-lever',
    { key: 'anamnese.mecanisme.torsion', op: 'checked' },
    'test',
    'tests.lever_sign',
    'Torsion ou pivot : le lever sign aide à exclure une rupture du LCA.',
  ),
  rule(
    'torsion-lachman',
    { key: 'anamnese.mecanisme.torsion', op: 'checked' },
    'test',
    'tests.lachman',
    'Torsion ou pivot : tester le LCA.',
  ),
  rule(
    'lachman-pivot',
    { key: 'tests.lachman', op: 'positive' },
    'test',
    'tests.pivot_shift',
    'Lachman positif : le pivot shift aide à confirmer (très spécifique).',
  ),
  rule(
    'choc-tiroir-post',
    {
      any: [
        { key: 'anamnese.mecanisme.choc', op: 'checked' },
        { key: 'anamnese.mecanisme.hyperext', op: 'checked' },
      ],
    },
    'test',
    'tests.tiroir_post',
    'Choc direct ou hyperextension : tester le LCP.',
  ),
  rule(
    'blocage-thessaly',
    {
      any: [
        { key: 'anamnese.signes.blocage', op: 'checked' },
        { key: 'anamnese.signes.epanch_retarde', op: 'checked' },
      ],
    },
    'test',
    'tests.thessaly',
    'Accrochages ou épanchement retardé : rechercher une lésion méniscale (score composite).',
  ),
  rule(
    'blocage-mcmurray',
    { key: 'anamnese.signes.blocage', op: 'checked' },
    'test',
    'tests.mcmurray',
    'Accrochages : compléter le score composite méniscal.',
  ),
  rule(
    'ant-squat',
    { key: 'anamnese.signes.douleur_ant', op: 'checked' },
    'test',
    'tests.squat_pfp',
    'Douleur antérieure : la douleur au squat sert surtout à exclure un SFP.',
  ),
  rule(
    'squat-tilt',
    { key: 'tests.squat_pfp', op: 'positive' },
    'test',
    'tests.tilt',
    'Squat douloureux : l’inclinaison patellaire aide à confirmer un SFP.',
  ),
  rule(
    'epanch-rapide-rf',
    { key: 'anamnese.signes.epanch_rapide', op: 'checked' },
    'redflag',
    'drapeaux.rouges.luxation',
    'Épanchement en 0 à 2 h : fracture ostéochondrale ou rupture ligamentaire possibles, vérifier l’état neurovasculaire.',
  ),
  rule(
    'peur-tsk',
    { key: 'drapeaux.jaunes.peur_mvt', op: 'checked' },
    'questionnaire',
    'tsk',
    'Peur du mouvement ou de la récidive : quantifier.',
  ),
  rule(
    'catastrophisme-pcs',
    { key: 'drapeaux.jaunes.catastrophisme', op: 'checked' },
    'questionnaire',
    'pcs',
    'Catastrophisme noté : quantifier avec la PCS.',
  ),
];

export const KNEE: ZoneDef = { id: 'knee', label: 'Genou', sections, rules };
