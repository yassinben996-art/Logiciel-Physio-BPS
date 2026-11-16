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
  items: readonly QItem[];
}

export type Scoring =
  /** NDI, ODI : sections notées 0–5 ; % = somme / (5 × sections répondues) × 100. */
  | { kind: 'sections-percent'; items: readonly string[] }
  /** QuickDASH : ((somme / n) − 1) × 25 ; invalide si plus d'une réponse manque. */
  | { kind: 'quickdash'; items: readonly string[] }
  /** TSK : somme ; items inversés (5 − x) ; invalide si une réponse manque. */
  | { kind: 'tsk'; items: readonly string[]; reversed: readonly string[] }
  /** painDETECT : somme des 7 items (0–5) + évolution (−1/0/+1) + irradiation (0/+2). */
  | { kind: 'paindetect'; items: readonly string[]; course: string; radiation: string };

export interface QDef {
  id: string;
  /** Nom affiché. */
  name: string;
  /** Régions concernées ('all' = toutes). */
  regions: readonly Region[] | 'all';
  /** Champ du cas alimenté par le score : incapacité (avec l'instrument) ou painDETECT. */
  feeds?: { field: 'dis'; instr: string } | { field: 'pd' };
  /** Référence de la version (affichée côté physio). */
  source: string;
  /** Avertissement (ex. traduction non validée). */
  warning?: string;
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
}

export type Answers = Readonly<Record<string, number>>;
