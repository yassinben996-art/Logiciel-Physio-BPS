// Règles de calcul des questionnaires (formules publiques, sans texte d'item).
import type { Answers, QDef, QResult, Scoring } from './types';

const got = (a: Answers, ids: readonly string[]) => ids.filter((id) => typeof a[id] === 'number');
const round1 = (n: number) => Math.round(n * 10) / 10;
const fr = (n: number) => String(n).replace('.', ',');

export function score(s: Scoring, a: Answers): QResult | null {
  switch (s.kind) {
    case 'sections-percent': {
      const ids = got(a, s.items);
      if (!ids.length) return null;
      const sum = ids.reduce((t, id) => t + a[id]!, 0);
      const pct = Math.round((sum / (5 * ids.length)) * 100);
      const n = ids.length;
      return {
        value: pct,
        display: `${pct} %`,
        answered: n,
        expected: s.items.length,
        valid: true,
        note: n < s.items.length ? `calculé sur ${n} sections sur ${s.items.length}` : undefined,
      };
    }
    case 'quickdash': {
      const ids = got(a, s.items);
      if (!ids.length) return null;
      const n = ids.length;
      const sum = ids.reduce((t, id) => t + a[id]!, 0);
      const valid = s.items.length - n <= 1;
      const v = round1((sum / n - 1) * 25);
      return {
        value: v,
        display: `${fr(v)} / 100`,
        answered: n,
        expected: s.items.length,
        valid,
        note: valid ? undefined : 'non valable : plus d’une réponse manquante',
      };
    }
    case 'tsk': {
      const ids = got(a, s.items);
      if (!ids.length) return null;
      const sum = ids.reduce((t, id) => t + (s.reversed.includes(id) ? 5 - a[id]! : a[id]!), 0);
      const valid = ids.length === s.items.length;
      return {
        value: sum,
        display: `${sum} / 68`,
        answered: ids.length,
        expected: s.items.length,
        valid,
        note: valid ? undefined : 'incomplet',
      };
    }
    case 'sum': {
      const ids = got(a, s.items);
      if (!ids.length) return null;
      const sum = ids.reduce((t, id) => t + a[id]!, 0);
      const valid = ids.length === s.items.length;
      const parts = valid
        ? s.subscales?.map(
            (sc) => `${sc.name} ${sc.items.reduce((t, id) => t + (a[id] ?? 0), 0)} / ${sc.max}`,
          )
        : undefined;
      return {
        value: sum,
        display: `${sum} / ${s.max}`,
        answered: ids.length,
        expected: s.items.length,
        valid,
        note: valid ? undefined : 'incomplet',
        parts,
      };
    }
    case 'spadi': {
      const all = [...s.pain, ...s.disability];
      const ids = got(a, all);
      if (!ids.length) return null;
      const valid = ids.length === all.length;
      const sumOf = (xs: readonly string[]) => xs.reduce((t, id) => t + (a[id] ?? 0), 0);
      const pain = round1((sumOf(s.pain) / (10 * s.pain.length)) * 100);
      const dis = round1((sumOf(s.disability) / (10 * s.disability.length)) * 100);
      const total = round1((pain + dis) / 2);
      return {
        value: total,
        display: `${fr(total)} / 100`,
        answered: ids.length,
        expected: all.length,
        valid,
        note: valid ? undefined : 'incomplet',
        parts: valid ? [`Douleur ${fr(pain)} / 100`, `Incapacité ${fr(dis)} / 100`] : undefined,
      };
    }
    case 'yes-count': {
      const ids = got(a, [s.pain, ...s.items]);
      if (!ids.length) return null;
      const yes = s.items.filter((id) => a[id] === 1).length;
      const valid = ids.length === s.items.length + 1;
      return {
        value: yes,
        display: `${yes} « oui » / ${s.items.length}`,
        answered: ids.length,
        expected: s.items.length + 1,
        valid,
        note: `douleur ${a[s.pain] ?? '—'}/10 · catégorie à saisir (règle de cotation officielle non intégrée)`,
      };
    }
    case 'paindetect': {
      const all = [...s.items, s.course, s.radiation];
      const ids = got(a, all);
      if (!ids.length) return null;
      const valid = ids.length === all.length;
      const total = got(a, s.items).reduce((t, id) => t + a[id]!, 0);
      const v = total + (a[s.course] ?? 0) + (a[s.radiation] ?? 0);
      const cat = v < 13 ? 'négatif' : v <= 18 ? 'incertain' : 'positif';
      return {
        value: v,
        display: `${v} / 38`,
        answered: ids.length,
        expected: all.length,
        valid,
        note: valid ? `composante neuropathique : ${cat}` : 'incomplet',
      };
    }
  }
}

export const scoreQ = (q: QDef, a: Answers | undefined): QResult | null => (a ? score(q.scoring, a) : null);

export const appliesTo = (q: QDef, region: string) =>
  q.regions === 'all' || q.regions.includes(region as never);
