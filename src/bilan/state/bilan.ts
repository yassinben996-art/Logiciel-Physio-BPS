// État d'un bilan : fonctions pures et immuables, sans dépendance à React.
import type { ZoneDef } from '../content/types';

export type Side = 'G' | 'D';
export type TestResult = 'pos' | 'neg';

export interface Identity {
  nom: string;
  prenom: string;
  /** AAAA-MM-JJ ou ''. */
  naissance: string;
}

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
  };
};

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
  s.dismissed.length > 0;
