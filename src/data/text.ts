// Libellés français portés depuis reference/prototype.html.
import type { Duration, Evidence, Level, Onset, StartRisk } from '../engine/types';

export const LEVELTXT: Readonly<Record<Level, string>> = {
  0: 'Sans signal',
  1: 'À surveiller',
  2: 'Présent',
};

export const EVTXT: Readonly<Record<Evidence, string>> = {
  CPG: 'Guideline',
  RCT: 'Essais ou revues',
  OBS: 'Étude observationnelle',
  EXP: 'Avis d’experts',
  NR: 'Non revu ici',
};

export const DURATION_TXT: Readonly<Record<Duration, string>> = {
  lt6w: 'Moins de 6 semaines',
  '6w3m': '6 semaines à 3 mois',
  gt3m: 'Plus de 3 mois',
};

/** Forme courte utilisée dans le résumé exporté. */
export const DURATION_SHORT: Readonly<Record<Duration, string>> = {
  lt6w: '< 6 semaines',
  '6w3m': '6 semaines à 3 mois',
  gt3m: '> 3 mois',
};

export const ONSET_TXT: Readonly<Record<Onset, string>> = {
  nontrauma: 'Non traumatique / insidieux',
  trauma: 'Traumatique',
  postop: 'Post-opératoire',
};

export const START_TXT: Readonly<Record<StartRisk, string>> = {
  na: 'Non passé',
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
};

export const START_LOWER: Readonly<Record<StartRisk, string>> = {
  na: 'non passé',
  low: 'faible',
  medium: 'moyen',
  high: 'élevé',
};

export interface Limit {
  lead: string;
  text: string;
  refs: string[];
}

/** Section « Limites à connaître » (renderStatic → #crit du prototype). */
export const LIMITS: readonly Limit[] = [
  {
    lead: 'Prédire n’est pas améliorer.',
    text: 'STarT MSK classe bien le risque (discrimination 0,82 à 0,84 en cohorte), mais les essais de soins stratifiés sont contrastés : la mise en œuvre pèse plus que l’outil.',
    refs: ['dunn21', 'croft24', 'hill11'],
  },
  {
    lead: 'Nuque.',
    text: 'Le contenu du modèle est validé par Delphi (70 éléments, six volets). L’efficacité clinique d’une prise en charge guidée par le modèle n’est pas démontrée.',
    refs: ['gerard25'],
  },
  {
    lead: 'Lombaires.',
    text: 'Essais pilotes sans randomisation, avec 29 % à 43 % de perdus de vue. Dans une cohorte rétrospective, seul le volet cognitivo-émotionnel prédisait le changement d’incapacité.',
    refs: ['long21', 'long23', 'lecam25'],
  },
  {
    lead: 'Épaule.',
    text: 'Adaptation non validée. Les facteurs psychologiques y prédisent moins l’évolution en traitement conservateur.',
    refs: ['sheik21', 'debaets19'],
  },
  {
    lead: 'Drapeaux rouges.',
    text: 'Isolés, ils ont une faible valeur ; l’antécédent de cancer est le plus fiable pour la malignité, et 64 % des tumeurs vertébrales d’une grande série n’avaient aucun drapeau.',
    refs: ['verh16', 'prem18', 'nota25'],
  },
  {
    lead: 'Questionnaires.',
    text: 'STarT MSK, CSI, painDETECT, NDI, ODI et SPADI relèvent de licences : utilise les versions officielles. Ici, tu saisis seulement les scores.',
    refs: [],
  },
  {
    lead: 'Seuils de changement.',
    text: 'Essai PDDM lombaire : réduction ≥ 20 % de la douleur et de l’incapacité, PGIC ≥ 3, FABQ-PA −4 points, FABQ-W −7 points.',
    refs: ['long23b'],
  },
  {
    lead: 'Règles d’allumage.',
    text: 'Les seuils qui allument un volet (nombre d’éléments, notes de 0 à 10) sont mes choix de conception, pas des seuils publiés. Seuls CSI-9 ≥ 20 et les catégories painDETECT viennent d’outils publiés.',
    refs: ['tanaka19'],
  },
];

export const DISCLAIMER =
  'Aide au raisonnement clinique, non validée. Ne remplace ni l’examen clinique ni l’avis médical. Les seuils d’allumage des volets sont des choix de conception.';
