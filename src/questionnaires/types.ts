// Types des questionnaires intégrés. Les TEXTES des questionnaires sous licence ne sont pas dans ce dépôt
// public : ils vivent dans private/questionnaires.ts (exclu de git) et ne sont inclus que par la version
// personnelle (npm run build:private). Ici : structures et règles de calcul seulement.
import type { Region } from '../engine/types';

export interface QOption {
  label: string;
  value: number;
  /** Petit pictogramme (ex. courbe d'évolution painDETECT). */
  icon?: 'flat' | 'persistent-attacks' | 'attacks-free' | 'attacks-pain';
}

export interface QItem {
  id: string;
  text: string;
  /** Options propres à l'item ; sinon celles de la page. */
  options?: readonly QOption[];
}

export interface QPage {
  /** Consigne affichée en tête de page (facultative). */
  intro?: string;
  /** Options partagées par les items de la page. */
  options?: readonly QOption[];
  /** Libellés des extrémités d'une échelle chiffrée (ex. 0 = pas du tout, 6 = tout à fait). */
  ends?: readonly [string, string];
  items: readonly QItem[];
}

export type Scoring =
  /** NDI, ODI : sections notées 0–5 ; % = somme / (5 × sections répondues) × 100. */
  | { kind: 'sections-percent'; items: readonly string[] }
  /** QuickDASH : ((somme / n) − 1) × 25 ; invalide si plus d'une réponse manque. */
  | { kind: 'quickdash'; items: readonly string[] }
  /** TSK : somme ; items inversés (5 − x) ; invalide si une réponse manque. */
  | { kind: 'tsk'; items: readonly string[]; reversed: readonly string[] }
  /**
   * Somme simple (CSI, PCS, FABQ, PSEQ), valable seulement si tout est rempli ;
   * sous-échelles facultatives (sommes partielles).
   */
  | {
      kind: 'sum';
      items: readonly string[];
      max: number;
      subscales?: readonly { name: string; items: readonly string[]; max: number }[];
    }
  /** SPADI : douleur = somme/50 × 100, incapacité = somme/80 × 100, total = moyenne des deux. */
  | { kind: 'spadi'; pain: readonly string[]; disability: readonly string[] }
  /**
   * Réponses brutes sans catégorie (STarT MSK tant que la feuille de cotation officielle n'est pas fournie) :
   * intensité de la douleur + nombre de « oui ».
   */
  | {
      kind: 'yes-count';
      pain: string;
      items: readonly string[];
      /** Points possibles pour la question de douleur (cotation fournie partiellement : 0 à painMax). */
      painMax: number;
      /** Bornes supérieures des catégories faible et moyen (au-delà : élevé). */
      cuts: readonly [number, number];
    }
  /** painDETECT : somme des 7 items (0–5) + évolution (−1/0/+1) + irradiation (0/+2). */
  | { kind: 'paindetect'; items: readonly string[]; course: string; radiation: string };

export interface QDef {
  id: string;
  /** Nom affiché. */
  name: string;
  /** Régions concernées ('all' = toutes). */
  regions: readonly Region[] | 'all';
  /** Champ du cas alimenté par le score : incapacité (avec l'instrument) ou painDETECT. */
  feeds?:
    | { field: 'dis'; instr: string }
    | { field: 'pd' }
    | { field: 'csi'; csiType: 'csi9' | 'csi25' }
    | { field: 'start' }
    | { field: 'tsk' }
    | { field: 'fabqW'; subscale: string };
  /** Référence de la version (affichée côté physio). */
  source: string;
  /** Avertissement (ex. traduction non validée). */
  warning?: string;
  /** Non proposé par défaut au patient (le physio peut l'activer). */
  defaultOff?: boolean;
  pages: readonly QPage[];
  scoring: Scoring;
}

export interface QResult {
  /** Score principal (%, total ou score final selon le questionnaire). */
  value: number;
  /** Texte court : « 46 % », « 38 / 68 »… */
  display: string;
  /** Nombre de réponses et nombre attendu. */
  answered: number;
  expected: number;
  /** Faux si les règles de validité ne sont pas remplies (score non transmis au moteur). */
  valid: boolean;
  note?: string;
  /** Sous-scores : « Rumination 6 / 16 »… */
  parts?: string[];
  /** Valeurs numériques des sous-échelles, par nom. */
  sub?: Record<string, number>;
  /** Catégorie de risque (STarT MSK), seulement quand elle est certaine. */
  category?: 'low' | 'medium' | 'high';
}

export type Answers = Readonly<Record<string, number>>;
