// Résumé exportable (summaryLines() / toText() du prototype).
import { DOM } from '../data/domains';
import { REFS, RN } from '../data/refs';
import { REGION } from '../data/regions';
import { DISCLAIMER, DURATION_SHORT, EVTXT, LEVELTXT, START_LOWER } from '../data/text';
import { analyze } from './analyze';
import { fr } from './format';
import { interventions } from './interventions';
import { targets } from './targets';
import type { CaseState } from './types';

/** t = titre, p = paragraphe, w = alerte, h = titre de volet, s = sous-titre, li = puce, n = note. */
export type LineType = 't' | 'p' | 'w' | 'h' | 's' | 'li' | 'n';
export interface SummaryLine {
  t: LineType;
  s: string;
}

export function summaryLines(s: CaseState, date: Date = new Date()): SummaryLine[] {
  const X = analyze(s);
  const R = REGION[s.region];
  const L: SummaryLine[] = [];
  const label = s.label.trim() || 'non renseigné';
  const end = (x: string) => (x.endsWith('.') ? x : x + '.');
  const used = new Set<string>();
  const dt = date.toLocaleDateString('fr-CH');
  L.push({ t: 't', s: `Profil des moteurs de douleur : ${R.name}` });
  L.push({
    t: 'p',
    s:
      `Date : ${dt}. Repère : ${end(label)} Durée : ${DURATION_SHORT[s.duration]}. STarT MSK : ${START_LOWER[s.start]}.` +
      (s.pain !== null ? ` Douleur ${fr(s.pain)}/10.` : '') +
      (s.dis !== null ? ` ${s.instr} ${fr(s.dis)} %.` : ''),
  });
  const fl = [...X.flags.u, ...X.flags.m];
  if (fl.length) L.push({ t: 'w', s: `Drapeaux : ${fl.map((f) => f.label).join(' ; ')}` });
  if (s.goal.trim()) L.push({ t: 'p', s: `Objectif du patient : ${s.goal.trim()}` });
  X.order
    .filter((i) => X.A[i].level > 0)
    .forEach((i, k) => {
      const a = X.A[i];
      L.push({
        t: 'h',
        s: `${k + 1}. Volet ${i} ${DOM[i - 1]!.name} : ${LEVELTXT[a.level]}${a.sub ? ` (${a.sub})` : ''}`,
      });
      a.reasons.forEach((r) => L.push({ t: 'li', s: r }));
      L.push({ t: 's', s: 'Cibles' });
      targets(i, s, X).forEach((t) => L.push({ t: 'li', s: t }));
      L.push({ t: 's', s: 'Interventions' });
      interventions(i, s, X).forEach((x) => {
        x.r.forEach((k2) => used.add(k2));
        L.push({
          t: 'li',
          s: `${x.t} [${EVTXT[x.ev]}]${x.r.length ? ' (' + x.r.map((k2) => RN[k2]).join(', ') + ')' : ''} : ${x.d}`,
        });
      });
      a.refer.forEach((t) => L.push({ t: 'li', s: `Orienter si : ${t}` }));
    });
  if (used.size) {
    L.push({ t: 'h', s: 'Sources' });
    REFS.filter((r) => used.has(r.key)).forEach((r) =>
      L.push({ t: 'li', s: `${RN[r.key]}. ${r.title}${r.url ? ' - ' + r.url : ''}` }),
    );
  }
  L.push({ t: 'n', s: DISCLAIMER });
  return L;
}

export function toText(L: SummaryLine[]): string {
  return L.map((l) =>
    l.t === 't'
      ? l.s.toUpperCase()
      : l.t === 'h'
        ? '\n' + l.s
        : l.t === 's'
          ? l.s + ' :'
          : l.t === 'li'
            ? '- ' + l.s
            : l.s,
  ).join('\n');
}
