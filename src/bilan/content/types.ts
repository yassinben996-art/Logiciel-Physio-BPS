// Schéma du contenu clinique du bilan. Le contenu (sections, champs, pastilles, règles) vit dans les
// fichiers de données de ce dossier ; le code ne contient aucune donnée clinique (spec §5.1).

export interface Source {
  ref: string;
  /** Date d'ajout, AAAA-MM-JJ. */
  added: string;
  /** Contenu provisoire, à remplacer par la revue de la littérature. */
  provisional?: boolean;
}

/** Propriétés diagnostiques : autorisées seulement avec une source validée (non provisoire). */
export interface Dx {
  sens?: number;
  spec?: number;
  lrPos?: number;
  lrNeg?: number;
  source: Source;
}

export interface ChipDef {
  id: string;
  label: string;
  keywords?: readonly string[];
  redFlag?: boolean;
  source: Source;
}

export type SysmetaRubric =
  | 'Anamnèse'
  | 'Bilan articulaire'
  | 'Bilan musculaire'
  | "Test / Echelle d'évaluation"
  | 'Red flags / Yellow flags'
  | 'Plan de traitement';

export type FieldDef =
  | {
      kind: 'number';
      id: string;
      label: string;
      unit?: string;
      min: number;
      max: number;
      sided?: boolean;
      source: Source;
    }
  | {
      kind: 'choice';
      id: string;
      label: string;
      options: readonly { value: string; label: string }[];
      source: Source;
    }
  | { kind: 'test'; id: string; label: string; dx?: Dx; source: Source }
  | { kind: 'chips'; id: string; label: string; chips: readonly ChipDef[]; source: Source }
  | { kind: 'notes'; id: string; label: string; source: Source };

export interface SectionDef {
  id: string;
  title: string;
  sysmeta?: SysmetaRubric;
  fields: readonly FieldDef[];
  source: Source;
}

export type Op = 'eq' | 'gte' | 'lte' | 'checked' | 'positive' | 'negative' | 'filled' | 'includes';

export interface Atom {
  /** "section.field" ou "section.field.chip". */
  key: string;
  op: Op;
  value?: number | string;
}

export type Condition = Atom | { all: readonly Condition[] } | { any: readonly Condition[] };

export type SuggestionKind = 'test' | 'questionnaire' | 'redflag';

export interface RuleDef {
  id: string;
  when: Condition;
  kind: SuggestionKind;
  target: string;
  reason: string;
  source: Source;
}

export interface ZoneDef {
  id: 'shoulder' | 'knee' | 'lumbar' | 'cervical';
  label: string;
  sections: readonly SectionDef[];
  rules: readonly RuleDef[];
  /** Questionnaires à domicile proposés par défaut pour cette zone (ids de QUESTIONNAIRES). */
  homeQuestionnaires?: readonly string[];
}

// ---------- Accueil patient ----------

interface QBase {
  id: string;
  /** Texte au patient (vouvoiement). */
  patient: string;
  /** Libellé côté physio. */
  clinician: string;
  source: Source;
}

export interface IntakeOption {
  value: string;
  label: string;
}

export type IntakeQuestion =
  | (QBase & { kind: 'multi'; options: readonly IntakeOption[] })
  | (QBase & {
      kind: 'single';
      options: readonly IntakeOption[]; /** Posée seulement si la question « multi » id contient l'une de ces valeurs. */
      showIf?: { id: string; includes: readonly string[] };
    })
  /** Échelle de 0 à 10. */
  | (QBase & { kind: 'scale'; lo: string; hi: string })
  /** Valeurs 'oui' / 'non'. */
  | (QBase & { kind: 'yesno' })
  | (QBase & { kind: 'psfs'; max: number; lo: string; hi: string })
  | (QBase & { kind: 'bodychart' });

export interface PenDef {
  id: string;
  label: string;
  color: string;
  source: Source;
}

export interface IntakeDef {
  questions: readonly IntakeQuestion[];
  pens: readonly PenDef[];
  /** Le seul crayon proposé au patient. */
  patientPen: string;
}
