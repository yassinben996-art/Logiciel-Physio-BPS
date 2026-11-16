// Questionnaires utilisables librement en clinique (formulaires fournis par l'utilisateur), intégrés à la
// version publique. Transcription fidèle ; fautes d'orthographe évidentes corrigées ; « cochez / entourez »
// devient « touchez ». SPADI et PSEQ : traductions personnelles des versions anglaises, NON VALIDÉES.
// Les questionnaires sous licence (painDETECT, STarT MSK, ODI) restent dans private/ (exclu de git).
import type { QDef, QOption } from './types';

const six = (labels: string[]): QOption[] => labels.map((label, value) => ({ label, value }));
const fromOne = (labels: string[]): QOption[] => labels.map((label, i) => ({ label, value: i + 1 }));

/** Deux sections par écran. */
export function sectionPages(sections: [string, string, string[]][], intro: string) {
  const pages = [];
  for (let i = 0; i < sections.length; i += 2) {
    pages.push({
      intro: i === 0 ? intro : undefined,
      items: sections.slice(i, i + 2).map(([id, text, opts]) => ({ id, text, options: six(opts) })),
    });
  }
  return pages;
}

/* ------------------------------------------------------------------ NDI */
const ndiSections: [string, string, string[]][] = [
  [
    'ndi1',
    'Section 1 – Intensité des douleurs cervicales',
    [
      'Je n’ai pas de douleur en ce moment.',
      'La douleur est très légère en ce moment.',
      'La douleur est modérée en ce moment.',
      'La douleur est assez forte en ce moment.',
      'La douleur est très forte en ce moment.',
      'La douleur est la pire qu’on puisse imaginer en ce moment.',
    ],
  ],
  [
    'ndi2',
    'Section 2 – Soins personnels (ex. se laver, s’habiller)',
    [
      'Je peux faire mes soins personnels sans augmenter la douleur.',
      'Je peux faire mes soins personnels, mais cela augmente la douleur.',
      'C’est douloureux de faire mes soins personnels et je les fais lentement et avec précaution.',
      'J’ai besoin d’un peu d’aide, mais je peux faire la plupart de mes soins personnels.',
      'J’ai besoin d’aide tous les jours pour la plupart de mes soins personnels.',
      'Je ne m’habille pas, je me lave avec difficulté et je reste au lit.',
    ],
  ],
  [
    'ndi3',
    'Section 3 – Soulever des charges',
    [
      'Je peux soulever des objets lourds sans augmenter la douleur.',
      'Je peux soulever des objets lourds mais cela augmente la douleur.',
      'La douleur m’empêche de soulever des objets lourds à partir du sol, mais je peux les soulever s’ils sont bien placés (ex. sur une table).',
      'La douleur m’empêche de soulever des objets lourds, mais je peux soulever des objets légers ou moyens s’ils sont bien placés (ex. sur une table).',
      'Je peux seulement soulever des objets très légers.',
      'Je ne peux rien soulever, ni transporter.',
    ],
  ],
  [
    'ndi4',
    'Section 4 – Lecture',
    [
      'Je peux lire autant que je le veux, sans douleurs cervicales.',
      'Je peux lire autant que je le veux, avec de légères douleurs cervicales.',
      'Je peux lire autant que je le veux, avec des douleurs cervicales modérées.',
      'Je ne peux pas lire autant que je le veux, à cause de douleurs cervicales modérées.',
      'Je peux à peine lire, à cause de mes douleurs cervicales intenses.',
      'Je ne peux aucunement lire, à cause de mes douleurs cervicales.',
    ],
  ],
  [
    'ndi5',
    'Section 5 – Maux de tête',
    [
      'Je n’ai aucun mal de tête.',
      'J’ai des maux de tête légers et peu fréquents.',
      'J’ai des maux de tête modérés et peu fréquents.',
      'J’ai des maux de tête modérés et fréquents.',
      'J’ai des maux de tête intenses et fréquents.',
      'J’ai presque tout le temps des maux de tête.',
    ],
  ],
  [
    'ndi6',
    'Section 6 – Concentration',
    [
      'Je peux me concentrer complètement sans difficulté, quand je le veux.',
      'Je peux me concentrer complètement avec de légères difficultés, quand je le veux.',
      'Il m’est relativement difficile de me concentrer, quand je le veux.',
      'J’ai beaucoup de difficultés à me concentrer, quand je le veux.',
      'J’ai d’énormes difficultés à me concentrer, quand je le veux.',
      'Je n’arrive aucunement à me concentrer.',
    ],
  ],
  [
    'ndi7',
    'Section 7 – Travail (professionnel ou personnel)',
    [
      'Je peux travailler autant que je le veux.',
      'Je ne peux faire que mon travail courant, mais rien de plus.',
      'Je peux faire la plus grande partie de mon travail courant, mais rien de plus.',
      'Je ne peux pas faire mon travail courant.',
      'Je peux à peine travailler.',
      'Je ne peux aucunement travailler.',
    ],
  ],
  [
    'ndi8',
    'Section 8 – Conduite',
    [
      'Je peux conduire ma voiture sans aucune douleur.',
      'Je peux conduire ma voiture autant que je le veux, avec de légères douleurs.',
      'Je peux conduire ma voiture autant que je le veux, avec des douleurs modérées.',
      'Je ne peux pas conduire ma voiture autant que je le veux, en raison des douleurs modérées.',
      'Je peux à peine conduire en raison des douleurs intenses.',
      'Je ne conduis aucunement, à cause des douleurs.',
    ],
  ],
  [
    'ndi9',
    'Section 9 – Sommeil (avec ou sans prise médicamenteuse)',
    [
      'Mon sommeil n’est pas perturbé.',
      'Mon sommeil est à peine perturbé, moins de 1 heure sans dormir.',
      'Mon sommeil est un peu perturbé, 1-2 heures sans dormir.',
      'Mon sommeil est modérément perturbé, 2-3 heures sans dormir.',
      'Mon sommeil est très perturbé, 3-5 heures sans dormir.',
      'Mon sommeil est complètement perturbé, 5-7 heures sans dormir.',
    ],
  ],
  [
    'ndi10',
    'Section 10 – Loisirs (cuisine, sport, activités manuelles)',
    [
      'Je peux participer à toutes mes activités de loisirs sans aucune douleur.',
      'Je peux participer à toutes mes activités de loisirs, avec quelques douleurs.',
      'Je peux participer à la plupart de mes activités habituelles de loisirs, mais pas à toutes, à cause de la douleur.',
      'Je ne participe qu’à quelques-unes de mes activités de loisirs habituelles, à cause de mes douleurs.',
      'Je peux à peine participer à des activités de loisirs, à cause de mes douleurs.',
      'Je ne peux participer à aucune activité de loisirs, à cause de mes douleurs.',
    ],
  ],
];
const NDI: QDef = {
  id: 'ndi',
  name: 'Échelle d’incapacité cervicale (NDI)',
  regions: ['cervical'],
  feeds: { field: 'dis', instr: 'NDI' },
  source: 'Neck Disability Index, version française (formulaire fourni)',
  pages: sectionPages(
    ndiSections,
    'Ce questionnaire nous informe de l’effet de vos douleurs cervicales dans votre vie de tous les jours. Répondez à chacune des sections, en choisissant une seule réponse : celle qui vous décrit le mieux à ce moment-même.',
  ),
  scoring: { kind: 'sections-percent', items: ndiSections.map((s) => s[0]) },
};

/* ------------------------------------------------------------ QuickDASH */
const qdDiff = fromOne([
  'Aucune difficulté',
  'Difficulté légère',
  'Difficulté moyenne',
  'Difficulté importante',
  'Impossible',
]);
const QUICKDASH: QDef = {
  id: 'quickdash',
  name: 'QuickDASH',
  regions: ['shoulder'],
  feeds: { field: 'dis', instr: 'QuickDASH' },
  source: 'QuickDASH, version française (Paris)',
  pages: [
    {
      intro:
        'Évaluez vos possibilités d’effectuer les activités suivantes au cours des 7 derniers jours, en touchant la réponse appropriée.',
      options: qdDiff,
      items: [
        { id: 'qd1', text: 'Dévisser un couvercle serré ou neuf' },
        { id: 'qd2', text: 'Effectuer des tâches ménagères lourdes (nettoyage des sols ou des murs)' },
        { id: 'qd3', text: 'Porter des sacs de provisions ou une mallette' },
        { id: 'qd4', text: 'Se laver le dos' },
        { id: 'qd5', text: 'Couper la nourriture avec un couteau' },
        {
          id: 'qd6',
          text: 'Activités de loisir nécessitant une certaine force ou avec des chocs au niveau de l’épaule, du bras ou de la main (bricolage, tennis, golf, etc.)',
        },
      ],
    },
    {
      items: [
        {
          id: 'qd7',
          text: 'Pendant les 7 derniers jours, à quel point votre épaule, votre bras ou votre main vous a-t-elle gêné dans vos relations avec votre famille, vos amis ou vos voisins ?',
          options: fromOne(['Pas du tout', 'Légèrement', 'Moyennement', 'Beaucoup', 'Extrêmement']),
        },
        {
          id: 'qd8',
          text: 'Avez-vous été limité dans votre travail ou une de vos activités quotidiennes habituelles en raison de problèmes à votre épaule, votre bras ou votre main ?',
          options: fromOne([
            'Pas du tout limité',
            'Légèrement limité',
            'Moyennement limité',
            'Très limité',
            'Incapable',
          ]),
        },
      ],
    },
    {
      intro: 'Évaluez la sévérité des symptômes suivants durant les 7 derniers jours.',
      items: [
        {
          id: 'qd9',
          text: 'Douleur de l’épaule, du bras ou de la main',
          options: fromOne(['Aucune', 'Légère', 'Moyenne', 'Importante', 'Extrême']),
        },
        {
          id: 'qd10',
          text: 'Picotements ou fourmillements douloureux de l’épaule, du bras ou de la main',
          options: fromOne(['Aucune', 'Légère', 'Moyenne', 'Importante', 'Extrême']),
        },
        {
          id: 'qd11',
          text: 'Pendant les 7 derniers jours, votre sommeil a-t-il été perturbé par une douleur de votre épaule, de votre bras ou de votre main ?',
          options: fromOne([
            'Pas du tout perturbé',
            'Un peu perturbé',
            'Moyennement perturbé',
            'Très perturbé',
            'Tellement perturbé que je ne peux pas dormir',
          ]),
        },
      ],
    },
  ],
  scoring: { kind: 'quickdash', items: Array.from({ length: 11 }, (_, i) => `qd${i + 1}`) },
};

/* ---------------------------------------------------------------- SPADI */
const zeroTen = Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i }));
const spadiPain = [
  'Au pire',
  'Couché(e) sur le côté atteint',
  'En attrapant quelque chose sur une étagère haute',
  'En touchant l’arrière de votre nuque',
  'En poussant avec le bras atteint',
].map((text, i) => ({ id: `spa${i + 1}`, text }));
const spadiDis = [
  'Vous laver les cheveux',
  'Vous laver le dos',
  'Mettre un maillot de corps ou un pull',
  'Mettre une chemise qui se boutonne devant',
  'Mettre votre pantalon',
  'Poser un objet sur une étagère haute',
  'Porter un objet lourd (environ 4,5 kg)',
  'Sortir quelque chose de votre poche arrière',
].map((text, i) => ({ id: `spb${i + 1}`, text }));
const SPADI: QDef = {
  id: 'spadi',
  name: 'Indice de douleur et d’incapacité de l’épaule (SPADI)',
  regions: ['shoulder'],
  feeds: { field: 'dis', instr: 'SPADI' },
  source: 'Shoulder Pain and Disability Index (formulaire anglais fourni)',
  warning: 'Traduction personnelle de la version anglaise, non validée.',
  defaultOff: true,
  pages: [
    {
      intro:
        'Choisissez le chiffre qui décrit le mieux votre douleur à l’épaule au cours de la semaine passée. Quelle a été l’intensité de votre douleur…',
      options: zeroTen,
      ends: ['aucune douleur', 'pire douleur imaginable'],
      items: spadiPain,
    },
    {
      intro: 'Au cours de la semaine passée, quelle difficulté avez-vous eue pour…',
      options: zeroTen,
      ends: ['aucune difficulté', 'si difficile qu’il a fallu de l’aide'],
      items: spadiDis.slice(0, 4),
    },
    {
      intro: 'Au cours de la semaine passée, quelle difficulté avez-vous eue pour…',
      options: zeroTen,
      ends: ['aucune difficulté', 'si difficile qu’il a fallu de l’aide'],
      items: spadiDis.slice(4),
    },
  ],
  scoring: { kind: 'spadi', pain: spadiPain.map((i) => i.id), disability: spadiDis.map((i) => i.id) },
};

/* ------------------------------------------------------------------ CSI */
const csiOpts = six(['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours']);
const csiItems = [
  'J’ai la sensation d’un sommeil non récupérateur quand je me réveille le matin',
  'Je ressens des raideurs et des douleurs musculaires',
  'Je fais des crises d’angoisse',
  'Je grince ou serre les dents',
  'J’ai des problèmes de diarrhée et/ou de constipation',
  'J’ai besoin d’aide pour effectuer mes activités quotidiennes',
  'Je suis sensible aux fortes lumières',
  'Je me fatigue très facilement lorsque je suis actif physiquement',
  'Je ressens des douleurs partout dans le corps',
  'J’ai des maux de tête',
  'Je ressens une gêne à la vessie et/ou des brûlures lorsque j’urine',
  'Je ne dors pas bien',
  'J’ai des difficultés de concentration',
  'J’ai des problèmes de peau tels que sécheresse, démangeaisons ou éruptions cutanées',
  'Le stress aggrave mes symptômes physiques',
  'Je me sens triste ou déprimé',
  'J’ai peu d’énergie',
  'Je ressens des tensions musculaires dans la nuque et dans les épaules',
  'J’ai mal à la mâchoire',
  'Certaines odeurs, comme des parfums, me donnent des nausées et des étourdissements',
  'Je dois uriner fréquemment',
  'J’ai la sensation désagréable des jambes sans repos lorsque j’essaye de dormir le soir',
  'J’ai des difficultés à me souvenir de certaines choses',
  'J’ai eu des traumatismes au cours de mon enfance',
  'Je ressens des douleurs dans la région du bassin',
].map((text, i) => ({ id: `csi${i + 1}`, text }));
const CSI: QDef = {
  id: 'csi',
  name: 'Inventaire de sensibilisation centrale (CSI)',
  regions: 'all',
  feeds: { field: 'csi', csiType: 'csi25' },
  source: 'Central Sensitization Inventory, partie A (25 items), version française (formulaire fourni)',
  pages: [0, 5, 10, 15, 20].map((k, i) => ({
    intro: i === 0 ? 'Indiquez pour chaque situation la proposition la plus adaptée.' : undefined,
    options: csiOpts,
    items: csiItems.slice(k, k + 5),
  })),
  scoring: { kind: 'sum', items: csiItems.map((i) => i.id), max: 100 },
};

/* ------------------------------------------------------------------ TSK */
const tskOpts = fromOne([
  'Fortement en désaccord',
  'Quelque peu en désaccord',
  'Quelque peu en accord',
  'Fortement en accord',
]);
const tskItems = [
  'J’ai peur de me blesser si je fais de l’activité physique',
  'Ma douleur ne ferait qu’intensifier si j’essayais de la vaincre',
  'Mon corps me dit que quelque chose ne va vraiment pas',
  'Si je faisais de l’activité physique, ma douleur serait probablement soulagée',
  'Les gens ne prennent pas mon état de santé assez au sérieux',
  'Mon accident a mis mon corps en danger pour le reste de mes jours',
  'La douleur signifie toujours que je me suis blessé(e)',
  'Même si quelque chose aggrave ma douleur, cela ne veut pas dire que c’est dangereux',
  'J’ai peur de me blesser accidentellement',
  'La meilleure façon d’empêcher que ma douleur s’aggrave est de m’assurer de ne pas faire des mouvements inutiles',
  'Je n’aurais pas tant de douleurs s’il ne se passait pas quelque chose de grave dans mon corps',
  'Bien que ma condition soit pénible, je serais mieux si j’étais physiquement actif(ve)',
  'La douleur m’indique quand arrêter de faire des activités physiques pour que je ne me blesse pas',
  'Il n’est pas prudent qu’une personne avec un état de santé comme le mien soit physiquement active',
  'Je ne peux pas faire tout ce qu’une personne normale peut faire parce que j’ai plus de risques de me blesser',
  'Bien qu’il y ait quelque chose qui me cause beaucoup de douleurs, je ne pense pas que ce soit vraiment grave',
  'Personne ne devrait être obligé de faire des exercices lorsqu’il (elle) ressent de la douleur',
].map((text, i) => ({ id: `tsk${i + 1}`, text }));
const TSK: QDef = {
  id: 'tsk',
  name: 'Questionnaire Tampa (TSK) – kinésiophobie',
  regions: ['cervical', 'shoulder'],
  feeds: { field: 'tsk' },
  source: 'Tampa Scale for Kinesiophobia (Kori et al., 1990), traduite par French et Roach',
  pages: [
    {
      intro:
        'Lisez attentivement chaque phrase et choisissez la réponse qui correspond le mieux à vos sentiments.',
      options: tskOpts,
      items: tskItems.slice(0, 6),
    },
    { options: tskOpts, items: tskItems.slice(6, 12) },
    { options: tskOpts, items: tskItems.slice(12) },
  ],
  scoring: { kind: 'tsk', items: tskItems.map((i) => i.id), reversed: ['tsk4', 'tsk8', 'tsk12', 'tsk16'] },
};

/* ------------------------------------------------------------------ PCS */
const pcsOpts = six(['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'En permanence']);
const pcsItems = [
  'Je me préoccupe constamment de savoir si la douleur s’arrêtera',
  'J’ai l’impression que je ne pourrai pas continuer ainsi',
  'C’est terrible et je pense que ça ne s’améliorera jamais',
  'C’est affreux et je sens que c’est plus fort que moi',
  'J’ai l’impression de ne plus pouvoir supporter la douleur',
  'J’ai peur que la douleur ne s’aggrave',
  'Je ne cesse de penser à d’autres expériences douloureuses',
  'Je souhaite avec angoisse que la douleur disparaisse',
  'Je ne peux pas m’empêcher d’y penser',
  'Je ne cesse de penser à quel point ça fait mal',
  'Je ne cesse de penser à quel point je veux que la douleur disparaisse',
  'Il n’y a rien que je puisse faire pour réduire l’intensité de la douleur',
  'Je me demande s’il va m’arriver quelque chose de grave',
].map((text, i) => ({ id: `pcs${i + 1}`, text }));
const PCS: QDef = {
  id: 'pcs',
  name: 'Échelle de catastrophisme face à la douleur (PCS)',
  regions: 'all',
  source: 'Pain Catastrophizing Scale, version française (formulaire fourni)',
  pages: [
    {
      intro:
        'Voici des pensées et émotions qui peuvent être associées à la douleur. Indiquez à quel point vous les avez. Quand j’ai mal…',
      options: pcsOpts,
      items: pcsItems.slice(0, 5),
    },
    { intro: 'Quand j’ai mal…', options: pcsOpts, items: pcsItems.slice(5, 9) },
    { intro: 'Quand j’ai mal…', options: pcsOpts, items: pcsItems.slice(9) },
  ],
  scoring: {
    kind: 'sum',
    items: pcsItems.map((i) => i.id),
    max: 52,
    subscales: [
      { name: 'Rumination', items: ['pcs8', 'pcs9', 'pcs10', 'pcs11'], max: 16 },
      { name: 'Amplification', items: ['pcs6', 'pcs7', 'pcs13'], max: 12 },
      { name: 'Impuissance', items: ['pcs1', 'pcs2', 'pcs3', 'pcs4', 'pcs5', 'pcs12'], max: 24 },
    ],
  },
};

/* ----------------------------------------------------------------- FABQ */
const zeroSix = six(['0', '1', '2', '3', '4', '5', '6']);
const fabqEnds = ['Absolument pas d’accord', 'Complètement d’accord'] as const;
const fabqItems = [
  'Ma douleur a été provoquée par l’activité physique',
  'L’activité physique aggrave ma douleur',
  'L’activité physique pourrait abîmer mon dos',
  'Je ne voudrais pas faire d’activités physiques qui peuvent ou qui pourraient aggraver ma douleur',
  'Je ne devrais pas avoir d’activités physiques qui peuvent ou qui pourraient aggraver ma douleur',
  'Ma douleur a été causée par mon travail ou par un accident de travail',
  'Mon travail a aggravé ma douleur',
  'Je mérite la reconnaissance de mon mal de dos en tant qu’accident de travail',
  'Mon travail est trop lourd pour moi',
  'Mon travail aggrave ou pourrait aggraver ma douleur',
  'Mon travail pourrait endommager/abîmer mon dos',
  'Je ne devrais pas effectuer mon travail habituel avec ma douleur actuelle',
  'Je ne peux pas faire mon travail habituel avec ma douleur actuelle',
  'Je ne peux pas faire mon travail habituel tant que ma douleur n’est pas traitée',
  'Je ne pense pas que je pourrais refaire mon travail habituel dans les 3 prochains mois',
  'Je ne pense pas que je pourrais jamais refaire mon travail',
].map((text, i) => ({ id: `fabq${i + 1}`, text }));
const FABQ: QDef = {
  id: 'fabq',
  name: 'Questionnaire des peurs et croyances (FABQ)',
  regions: ['lumbar'],
  feeds: { field: 'fabqW', subscale: 'Travail' },
  source:
    'Fear-Avoidance Beliefs Questionnaire (Waddell 1993), version française validée (Chaory et al. 2004)',
  pages: [
    {
      intro:
        'Voici des pensées que d’autres patients nous ont dites à propos de la douleur. Pour chaque remarque, choisissez le chiffre entre 0 et 6 qui exprime le mieux ce que vous éprouvez et ce qui atteint ou pourrait atteindre votre dos.',
      options: zeroSix,
      ends: fabqEnds,
      items: fabqItems.slice(0, 5),
    },
    {
      intro:
        'Les phrases suivantes concernent comment votre travail actuel affecte ou pourrait affecter votre mal de dos.',
      options: zeroSix,
      ends: fabqEnds,
      items: fabqItems.slice(5, 11),
    },
    { intro: 'Votre travail (suite).', options: zeroSix, ends: fabqEnds, items: fabqItems.slice(11) },
  ],
  scoring: {
    kind: 'sum',
    items: fabqItems.map((i) => i.id),
    max: 96,
    subscales: [
      { name: 'Activité physique', items: ['fabq2', 'fabq3', 'fabq4', 'fabq5'], max: 24 },
      {
        name: 'Travail',
        items: ['fabq6', 'fabq7', 'fabq9', 'fabq10', 'fabq11', 'fabq12', 'fabq15'],
        max: 42,
      },
    ],
  },
};

/* ----------------------------------------------------------------- PSEQ */
const pseqEnds = ['Pas du tout confiant(e)', 'Tout à fait confiant(e)'] as const;
const pseqItems = [
  'Je peux apprécier les choses, malgré la douleur.',
  'Je peux faire la plupart des tâches ménagères (par exemple ranger, faire la vaisselle, etc.), malgré la douleur.',
  'Je peux voir mes amis ou ma famille aussi souvent qu’avant, malgré la douleur.',
  'Je peux faire face à ma douleur dans la plupart des situations.',
  'Je peux faire une forme de travail, malgré la douleur (le « travail » comprend les tâches ménagères, rémunérées ou non).',
  'Je peux encore faire beaucoup des choses que j’aime faire, comme des loisirs ou des passe-temps, malgré la douleur.',
  'Je peux faire face à ma douleur sans médicaments.',
  'Je peux encore atteindre la plupart de mes objectifs de vie, malgré la douleur.',
  'Je peux mener une vie normale, malgré la douleur.',
  'Je peux progressivement devenir plus actif(ve), malgré la douleur.',
].map((text, i) => ({ id: `pseq${i + 1}`, text }));
const PSEQ: QDef = {
  id: 'pseq',
  name: 'Questionnaire d’auto-efficacité face à la douleur (PSEQ)',
  regions: 'all',
  source: 'Pain Self-Efficacy Questionnaire (Nicholas 1989)',
  warning: 'Traduction personnelle de la version anglaise, non validée.',
  pages: [
    {
      intro:
        'Indiquez à quel point vous êtes confiant(e) de pouvoir faire les choses suivantes actuellement, malgré la douleur. On ne vous demande pas si vous les avez faites, mais si vous vous sentez capable de les faire maintenant.',
      options: zeroSix,
      ends: pseqEnds,
      items: pseqItems.slice(0, 5),
    },
    { options: zeroSix, ends: pseqEnds, items: pseqItems.slice(5) },
  ],
  scoring: { kind: 'sum', items: pseqItems.map((i) => i.id), max: 60 },
};

export { NDI, QUICKDASH, SPADI, CSI, TSK, PCS, FABQ, PSEQ };

/** Ordre de passation (version publique). */
export const QUESTIONNAIRES: readonly QDef[] = [NDI, QUICKDASH, SPADI, CSI, TSK, PCS, FABQ, PSEQ];
