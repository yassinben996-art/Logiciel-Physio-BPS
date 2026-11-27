// Suivi des patients : date du prochain rebilan et liste « À rebilanter ». Dates au jour près, heure de Lausanne.
import type { FollowUp } from '../state/bilan';
import type { BilanMeta } from '../storage/vault';

/** Délais proposés (semaines). */
export const FOLLOW_WEEKS = [1, 2, 3, 4, 6, 8] as const;

/** AAAA-MM-JJ d'un instant, en heure de Lausanne. */
export const zurichDay = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date(iso));

export const today = (): string => zurichDay(new Date().toISOString());

const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Date choisie par Yass, sinon date du bilan + délai. */
export const nextDue = (createdAt: string, f: FollowUp): string =>
  f.due ?? addDays(zurichDay(createdAt), 7 * f.weeks);

/** Report à partir d'aujourd'hui. */
export const postpone = (from: string, days: number): string => addDays(from, days);

/** « 27.11.2026 ». */
export const frDay = (day: string): string => day.split('-').reverse().join('.');

/**
 * Patients à rebilanter : pour chaque patient, son dernier bilan (copies en conflit exclues) ; retenu si la prise
 * en charge continue et que l'échéance est atteinte. Le plus en retard d'abord.
 */
export function dueList(metas: readonly BilanMeta[], day: string): { meta: BilanMeta; late: number }[] {
  const last = new Map<string, BilanMeta>();
  for (const m of metas) {
    if (m.conflictOf) continue;
    const p = m.patientId ?? m.id;
    const cur = last.get(p);
    if (!cur || (m.createdAt ?? '') > (cur.createdAt ?? '')) last.set(p, m);
  }
  return [...last.values()]
    .filter((m) => !m.closed && !!m.due && m.due <= day)
    .map((meta) => ({ meta, late: daysBetween(meta.due!, day) }))
    .sort((a, b) => b.late - a.late);
}
