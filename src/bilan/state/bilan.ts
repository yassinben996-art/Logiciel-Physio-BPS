// État d'un bilan : fonctions pures et immuables, sans dépendance à React.
import type { Stroke } from '../bodychart/geometry';
import type { ZoneDef } from '../content/types';

export type Side = 'G' | 'D';
export type TestResult = 'pos' | 'neg';

export interface Identity {
  nom: string;
  prenom: string;
  /** AAAA-MM-JJ ou ''. */
  naissance: string;
}

export interface PsfsItem {
  activity: string;
  score: number | null;
}
/** yesno : 'oui' | 'non' ; multi : liste ; scale : nombre ; psfs : liste d'activités. */
export type IntakeValue = string | readonly string[] | number | readonly PsfsItem[];
export type IntakeStatus = 'none' | 'patient' | 'physio';

export interface IntakeState {
  status: IntakeStatus;
  /** ISO, '' si jamais rempli par le patient. */
  patientAt: string;
  /** Valeurs retenues. */
  answers: Readonly<Record<string, IntakeValue>>;
  /** Réponses telles que données par le patient (conservées quand le physio corrige). */
  original: Readonly<Record<string, IntakeValue>>;
  strokes: readonly Stroke[];
}

export const LABEL_STATUS: Readonly<Record<IntakeStatus, string>> = {
  none: 'non fait',
  patient: 'rempli par le patient',
  physio: 'rempli par le physio en séance',
};

export const emptyIntake = (): IntakeState => ({
  status: 'none',
  patientAt: '',
  answers: {},
  original: {},
  strokes: [],
});

export interface BilanState {
  /** crypto.randomUUID() */
  id: string;
  /** "B-" + 4 chiffres, affichage seulement. */
  code: string;
  createdAt: string;
  updatedAt: string;
  identity: Identity;
  zone: ZoneDef['id'];
  /** Clé "s.f", ou "s.f.G" / "s.f.D" si le champ est latéralisé. */
  nums: Readonly<Record<string, number>>;
  /** Clés saisies hors bornes (valeur ignorée par les règles et les exports). */
  invalid: Readonly<Record<string, true>>;
  choices: Readonly<Record<string, string>>;
  /** Clé "s.f". */
  tests: Readonly<Record<string, TestResult>>;
  /** Clé "s.f.chip". */
  chips: Readonly<Record<string, true>>;
  /** Clé "s.notes". */
  notes: Readonly<Record<string, string>>;
  /** Ids de règles acceptées. */
  accepted: readonly string[];
  /** Ids de règles refusées, et "kw:<s.f.chip>" pour les mots-clés refusés. */
  dismissed: readonly string[];
  intake: IntakeState;
}

export type BilanAction =
  | { type: 'num'; key: string; value: number | null; min: number; max: number }
  | { type: 'choice'; key: string; value: string | null }
  | { type: 'test'; key: string; value: TestResult | null }
  | { type: 'chip'; key: string; value: boolean }
  | { type: 'note'; key: string; value: string }
  | { type: 'identity'; field: keyof Identity; value: string }
  | { type: 'accept'; id: string }
  | { type: 'dismiss'; id: string }
  | { type: 'intake'; id: string; value: IntakeValue | null; by: 'patient' | 'physio' }
  | { type: 'stroke'; stroke: Stroke }
  | { type: 'eraseStroke'; index: number }
  | { type: 'undoStroke' }
  | { type: 'intakeStatus'; status: IntakeStatus }
  | { type: 'load'; bilan: BilanState }
  | { type: 'reset' };

const newCode = (): string => {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 10000;
  return 'B-' + String(n).padStart(4, '0');
};

export const emptyBilan = (zone: ZoneDef['id']): BilanState => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    code: newCode(),
    createdAt: now,
    updatedAt: now,
    identity: { nom: '', prenom: '', naissance: '' },
    zone,
    nums: {},
    invalid: {},
    choices: {},
    tests: {},
    chips: {},
    notes: {},
    accepted: [],
    dismissed: [],
    intake: emptyIntake(),
  };
};

/** Accueil tel qu'enregistré par la PR #6 (25.11.2026), avant la fusion des deux versions. */
interface Pr6Intake {
  painNow?: number | null;
  painWorst?: number | null;
  duration?: string | null;
  onset?: string | null;
  psfs?: readonly PsfsItem[];
  screening?: Readonly<Record<string, boolean>>;
  completedAt?: string;
}

/**
 * Reprend un accueil de la PR #6 dans le format actuel. Les réponses deviennent des réponses du patient.
 * Les zones touchées de l'ancien body chart ne peuvent pas devenir des traits : elles ne sont pas reprises.
 */
function fromPr6(o: Pr6Intake): IntakeState {
  const a: Record<string, IntakeValue> = {};
  if (typeof o.painNow === 'number') a.douleur_actuelle = o.painNow;
  if (typeof o.painWorst === 'number') a.douleur_pire = o.painWorst;
  if (o.duration) a.duree = o.duration;
  if (o.onset) a.debut = o.onset;
  if (o.psfs?.length) a.psfs = o.psfs;
  const yes = (k: string, id: string) => {
    const v = o.screening?.[k];
    if (typeof v === 'boolean') a[id] = v ? 'oui' : 'non';
  };
  yes('sommeil', 'sommeil');
  yes('arret', 'arret');
  yes('travail', 'pression');
  const done = !!o.completedAt;
  return {
    status: done ? 'patient' : 'none',
    patientAt: o.completedAt ?? '',
    answers: a,
    original: a,
    strokes: [],
  };
}

/** Complète un bilan enregistré par une version antérieure (plan 1 : pas d'accueil ; PR #6 : autre format). */
export function normalizeBilan(b: unknown): BilanState {
  const x = b as Omit<Partial<BilanState>, 'intake'> & Pick<BilanState, 'id' | 'zone'> & { intake?: unknown };
  const base = emptyBilan(x.zone);
  const raw = x.intake as (Partial<IntakeState> & Pr6Intake) | undefined;
  const intake: IntakeState = !raw
    ? emptyIntake()
    : 'answers' in raw
      ? { ...emptyIntake(), ...raw }
      : fromPr6(raw);
  return { ...base, ...x, intake };
}

function without<T>(r: Readonly<Record<string, T>>, key: string): Record<string, T> {
  if (!(key in r)) return r as Record<string, T>;
  const next = { ...r };
  delete next[key];
  return next;
}

function set<T>(r: Readonly<Record<string, T>>, key: string, value: T | null): Record<string, T> {
  return value === null ? without(r, key) : { ...r, [key]: value };
}

const addOnce = (l: readonly string[], id: string): readonly string[] => (l.includes(id) ? l : [...l, id]);

function apply(s: BilanState, a: Exclude<BilanAction, { type: 'load' } | { type: 'reset' }>): BilanState {
  switch (a.type) {
    case 'num': {
      if (a.value === null || !Number.isFinite(a.value))
        return { ...s, nums: without(s.nums, a.key), invalid: without(s.invalid, a.key) };
      if (a.value < a.min || a.value > a.max)
        return { ...s, nums: without(s.nums, a.key), invalid: { ...s.invalid, [a.key]: true } };
      return { ...s, nums: { ...s.nums, [a.key]: a.value }, invalid: without(s.invalid, a.key) };
    }
    case 'choice':
      return { ...s, choices: set(s.choices, a.key, a.value) };
    case 'test':
      return { ...s, tests: set(s.tests, a.key, a.value) };
    case 'chip':
      return { ...s, chips: set<true>(s.chips, a.key, a.value ? true : null) };
    case 'note':
      return { ...s, notes: set(s.notes, a.key, a.value === '' ? null : a.value) };
    case 'identity':
      return { ...s, identity: { ...s.identity, [a.field]: a.value } };
    case 'accept':
      return { ...s, accepted: addOnce(s.accepted, a.id) };
    case 'dismiss':
      return { ...s, dismissed: addOnce(s.dismissed, a.id) };
    case 'intake': {
      const i = s.intake;
      return {
        ...s,
        intake: {
          ...i,
          answers: set(i.answers, a.id, a.value),
          original: a.by === 'patient' ? set(i.original, a.id, a.value) : i.original,
        },
      };
    }
    case 'stroke':
      return { ...s, intake: { ...s.intake, strokes: [...s.intake.strokes, a.stroke] } };
    // Les traits du patient sont sa réponse d'origine : seuls ceux du physio s'effacent ou s'annulent.
    case 'eraseStroke':
      return s.intake.strokes[a.index]?.by === 'physio'
        ? { ...s, intake: { ...s.intake, strokes: s.intake.strokes.filter((_, k) => k !== a.index) } }
        : s;
    case 'undoStroke': {
      const k = s.intake.strokes.map((x) => x.by).lastIndexOf('physio');
      return k < 0
        ? s
        : { ...s, intake: { ...s.intake, strokes: s.intake.strokes.filter((_, j) => j !== k) } };
    }
    case 'intakeStatus':
      return {
        ...s,
        intake: {
          ...s.intake,
          status: a.status,
          patientAt: a.status === 'patient' ? new Date().toISOString() : s.intake.patientAt,
        },
      };
  }
}

export function bilanReducer(s: BilanState, a: BilanAction): BilanState {
  if (a.type === 'load') return a.bilan;
  if (a.type === 'reset') return emptyBilan(s.zone);
  const next = apply(s, a);
  return next === s ? s : { ...next, updatedAt: new Date().toISOString() };
}

const nonEmpty = (r: Readonly<Record<string, unknown>>) => Object.keys(r).length > 0;

export const isDirty = (s: BilanState): boolean =>
  nonEmpty(s.nums) ||
  nonEmpty(s.invalid) ||
  nonEmpty(s.choices) ||
  nonEmpty(s.tests) ||
  nonEmpty(s.chips) ||
  Object.values(s.notes).some((n) => n.trim() !== '') ||
  Object.values(s.identity).some((v) => v.trim() !== '') ||
  s.accepted.length > 0 ||
  s.dismissed.length > 0 ||
  nonEmpty(s.intake.answers) ||
  s.intake.strokes.length > 0 ||
  s.intake.status !== 'none';
