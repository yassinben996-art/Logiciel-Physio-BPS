// Moteur de règles déterministe : suggestions de tests, de questionnaires et de drapeaux à vérifier.
// Il ne fait que suggérer ; rien n'est coché ni accepté sans le clinicien.
import { QUESTIONNAIRES } from '@q';
import type { Condition, Op, Source, SuggestionKind, ZoneDef } from '../content/types';
import { regionsOf } from '../bodychart/geometry';
import { CHART_REGIONS_KEY, resolveKey } from '../content/validate';
import type { BilanState, IntakeValue } from '../state/bilan';
import { withinBounds } from './bounds';

export interface Suggestion {
  ruleId: string;
  kind: SuggestionKind;
  target: string;
  label: string;
  reason: string;
  source: Source;
}

/** Valeurs numériques valides d'une clé : la clé seule, ou ses côtés D et G. */
const numsOf = (s: BilanState, key: string): number[] =>
  [key, `${key}.D`, `${key}.G`].map((k) => s.nums[k]).filter((v): v is number => v !== undefined);

const filled = (s: BilanState, key: string): boolean =>
  numsOf(s, key).length > 0 ||
  key in s.tests ||
  key in s.choices ||
  (s.notes[key] ?? '').trim() !== '' ||
  Object.keys(s.chips).some((k) => k.startsWith(key + '.'));

const intakeFilled = (v: IntakeValue | undefined): boolean => {
  if (v === undefined || v === '') return false;
  if (Array.isArray(v))
    return v.some((x: string | { activity: string }) =>
      typeof x === 'string' ? true : x.activity.trim() !== '',
    );
  return true;
};

/** Condition sur une réponse de l'accueil (clé « accueil.<id> »). */
function matchIntake(id: string, op: Op, value: number | string | undefined, s: BilanState): boolean {
  if (`accueil.${id}` === CHART_REGIONS_KEY) {
    const n = regionsOf(s.intake.strokes, 'douleur').length;
    return typeof value === 'number' && (op === 'gte' ? n >= value : op === 'lte' ? n <= value : false);
  }
  if (id === 'chart' && op === 'filled') return s.intake.strokes.length > 0;
  const v = s.intake.answers[id];
  switch (op) {
    case 'filled':
      return intakeFilled(v);
    case 'includes':
      return Array.isArray(v) && (v as readonly unknown[]).includes(value);
    case 'eq':
      return v === value;
    case 'gte':
      return typeof v === 'number' && typeof value === 'number' && v >= value;
    case 'lte':
      return typeof v === 'number' && typeof value === 'number' && v <= value;
    default:
      return false;
  }
}

export function matches(c: Condition, s: BilanState): boolean {
  if ('all' in c) return c.all.every((x) => matches(x, s));
  if ('any' in c) return c.any.some((x) => matches(x, s));
  const { key, op, value } = c;
  if (key.startsWith('accueil.')) return matchIntake(key.slice('accueil.'.length), op, value, s);
  switch (op) {
    case 'checked':
      return s.chips[key] === true;
    case 'positive':
      return s.tests[key] === 'pos';
    case 'negative':
      return s.tests[key] === 'neg';
    case 'filled':
      return filled(s, key);
    case 'gte':
      return typeof value === 'number' && numsOf(s, key).some((v) => v >= value);
    case 'lte':
      return typeof value === 'number' && numsOf(s, key).some((v) => v <= value);
    case 'includes':
      return false; // seules les réponses de l'accueil sont des listes
    case 'eq':
      return typeof value === 'number' ? numsOf(s, key).includes(value) : s.choices[key] === value;
  }
}

function labelOf(z: ZoneDef, kind: SuggestionKind, target: string): string {
  if (kind === 'questionnaire') {
    if (target === 'psfs') return 'PSFS';
    return QUESTIONNAIRES.find((q) => q.id === target)?.name ?? target;
  }
  const r = resolveKey(z, target);
  if (!r) return target;
  return r.type === 'chip' ? r.chip.label : r.field.label;
}

export function evaluate(z: ZoneDef, state: BilanState): Suggestion[] {
  const s = withinBounds(z, state);
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const r of z.rules) {
    if (s.accepted.includes(r.id) || s.dismissed.includes(r.id)) continue;
    if (r.kind === 'test' && r.target in s.tests) continue;
    if (r.kind === 'redflag' && s.chips[r.target]) continue;
    const id = `${r.kind}:${r.target}`;
    if (seen.has(id) || !matches(r.when, s)) continue;
    seen.add(id);
    out.push({
      ruleId: r.id,
      kind: r.kind,
      target: r.target,
      label: labelOf(z, r.kind, r.target),
      reason: r.reason,
      source: r.source,
    });
  }
  return out;
}
