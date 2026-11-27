// Évolution entre les bilans d'un même patient : valeurs côte à côte et écart du premier au dernier, sans jugement.
import { fr } from '../../engine/format';
import { QUESTIONNAIRES } from '../../questionnaires/public';
import { scoreQ } from '../../questionnaires/scoring';
import { INTAKE } from '../content/intake';
import type { FieldDef, SectionDef, ZoneDef } from '../content/types';
import type { BilanState, PsfsItem } from '../state/bilan';
import { withinBounds } from './bounds';
import { normalize } from './keywords';
import { fieldLine, withUnit } from './exports';

export interface EvolutionRow {
  label: string;
  /** Une valeur par colonne (null : non renseigné). */
  values: (string | null)[];
  /** Écart entre la première et la dernière valeur chiffrée (« +30° », « −3 »). */
  delta?: string;
}

const MAX_RECENT = 5;

/** Bilans de la série, du plus ancien au plus récent : le premier, puis les 5 derniers au plus. */
export function seriesColumns(series: readonly BilanState[]): BilanState[] {
  const s = [...series].filter((b) => b.createdAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (s.length <= MAX_RECENT + 1) return s;
  return [s[0]!, ...s.slice(-MAX_RECENT)];
}

const signed = (d: number, unit?: string) => {
  const r = Math.round(d * 10) / 10;
  if (r === 0) return withUnit(0, unit);
  return (r > 0 ? '+' : '−') + withUnit(Math.abs(r), unit);
};

/** Ligne à partir de valeurs chiffrées (null = absent) ; retirée si aucune colonne n'est renseignée. */
function numRow(
  label: string,
  nums: (number | null)[],
  show: (n: number) => string,
  unit?: string,
): EvolutionRow | null {
  if (nums.every((n) => n === null)) return null;
  const known = nums.filter((n): n is number => n !== null);
  const row: EvolutionRow = { label, values: nums.map((n) => (n === null ? null : show(n))) };
  // Écart du premier au dernier bilan, seulement si le dernier a la valeur (sinon il comparerait deux bilans anciens).
  if (known.length >= 2 && nums[nums.length - 1] !== null)
    row.delta = signed(known[known.length - 1]! - known[0]!, unit);
  return row;
}

export function evolutionRows(z: ZoneDef, columns: readonly BilanState[]): EvolutionRow[] {
  const cols = columns.map((b) => withinBounds(z, b));
  const rows: EvolutionRow[] = [];
  const push = (r: EvolutionRow | null) => r && rows.push(r);
  // Accueil : échelles 0–10 (douleur, peur, confiance).
  for (const q of INTAKE.questions) {
    if (q.kind !== 'scale') continue;
    push(
      numRow(
        q.clinician,
        cols.map((b) => {
          const v = b.intake.answers[q.id];
          return typeof v === 'number' ? v : null;
        }),
        fr,
      ),
    );
  }
  // PSFS : par activité (même texte, à la casse et aux espaces près).
  const acts = new Map<string, string>();
  for (const b of cols)
    for (const p of (b.intake.answers.psfs as readonly PsfsItem[] | undefined) ?? [])
      if (p.activity.trim() && !acts.has(normalize(p.activity.trim())))
        acts.set(normalize(p.activity.trim()), p.activity.trim());
  for (const [key, label] of acts)
    push(
      numRow(
        `PSFS : ${label}`,
        cols.map((b) => {
          const p = ((b.intake.answers.psfs as readonly PsfsItem[] | undefined) ?? []).find(
            (x) => normalize(x.activity.trim()) === key,
          );
          return p && typeof p.score === 'number' ? p.score : null;
        }),
        fr,
      ),
    );
  // Champs chiffrés (par côté) et tests, dans l'ordre du bilan.
  for (const sec of z.sections)
    for (const f of sec.fields) {
      const key = `${sec.id}.${f.id}`;
      if (f.kind === 'number') {
        const keys = f.sided
          ? (['D', 'G'] as const).map((side) => [`${f.label} ${side}`, `${key}.${side}`])
          : [[f.label, key]];
        for (const [label, k] of keys)
          push(
            numRow(
              label!,
              cols.map((b) => b.nums[k!] ?? null),
              (n) => withUnit(n, f.unit),
              f.unit,
            ),
          );
      } else if (f.kind === 'test') {
        const values = cols.map((b) => {
          const v = b.tests[key];
          return v === undefined ? null : v === 'pos' ? 'positif' : 'négatif';
        });
        if (values.some((v) => v !== null)) rows.push({ label: f.label, values });
      }
    }
  // Questionnaires (à domicile).
  for (const q of QUESTIONNAIRES) {
    const res = cols.map((b) => (b.qResults?.[q.id] ? scoreQ(q, b.qResults[q.id]!.answers) : null));
    if (res.every((r) => !r)) continue;
    const row: EvolutionRow = { label: q.name, values: res.map((r) => (r ? r.display : null)) };
    const valid = res.filter((r) => r?.valid);
    if (valid.length >= 2 && res[res.length - 1]?.valid)
      row.delta = signed(valid[valid.length - 1]!.value - valid[0]!.value);
    rows.push(row);
  }
  return rows;
}

/** Valeur d'un champ dans le bilan précédent, sans son libellé (« D 120° », « négatif »). */
export function previousValue(sec: SectionDef, f: FieldDef, prev: BilanState): string | null {
  const line = fieldLine(sec, f, prev);
  if (!line) return null;
  const prefix = `${f.label} : `;
  return line.startsWith(prefix) ? line.slice(prefix.length) : line;
}
