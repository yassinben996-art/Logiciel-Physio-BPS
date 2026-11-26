// Résumé du bilan envoyé à l'IA ou copié pour Claude : aucune identité, aucun code, aucune date de l'état ;
// textes libres nettoyés (spec IA §5.1).
import type { IntakeDef, ZoneDef } from '../content/types';
import { sectionLines } from '../engine/exports';
import { intakeLines } from '../engine/intakeText';
import { normalize } from '../engine/keywords';
import type { BilanState, PsfsItem } from '../state/bilan';
import { scrub, type ScrubContext } from './scrub';

const FIXED = [
  'épaule',
  'genou',
  'coiffe',
  'sus-épineux',
  'infra-épineux',
  'sous-scapulaire',
  'biceps',
  'deltoïde',
  'acromion',
  'clavicule',
  'omoplate',
  'scapula',
  'rachis',
  'cervical',
  'lombaire',
  'IRM',
  'RX',
  'US',
  'EVA',
  'EVN',
  'AINS',
  'TENS',
  'Jobe',
  'Neer',
  'Hawkins',
  'Kennedy',
  'Lachman',
  'Spurling',
  'Yocum',
  'Speed',
  'Yergason',
  "O'Brien",
  'Paxinos',
  'Cadogan',
  'Kim',
  'Jerk',
  'ULTT',
  'PSFS',
  'SPADI',
  'QuickDASH',
  'CSI',
  'TSK',
  'PCS',
  'FABQ',
  'PSEQ',
  'KOOS',
  'IKDC',
];

const words = (s: string) =>
  normalize(s)
    .split(/[^\p{L}]+/u)
    .filter(Boolean);

export function medicalDictionary(zones: readonly ZoneDef[], intake: IntakeDef): Set<string> {
  const d = new Set<string>(FIXED.flatMap(words));
  const add = (s: string) => words(s).forEach((w) => d.add(w));
  for (const z of zones) {
    add(z.label);
    for (const sec of z.sections) {
      add(sec.title);
      for (const f of sec.fields) {
        add(f.label);
        if (f.kind === 'chips') f.chips.forEach((c) => add(c.label));
        if (f.kind === 'choice') f.options.forEach((o) => add(o.label));
      }
    }
  }
  for (const q of intake.questions) {
    add(q.patient);
    add(q.clinician);
    if (q.kind === 'multi' || q.kind === 'single') q.options.forEach((o) => add(o.label));
  }
  intake.pens.forEach((p) => add(p.label));
  return d;
}

export function buildSummary(
  z: ZoneDef,
  s: BilanState,
  intake: IntakeDef,
  ignored: readonly string[] = [],
): string {
  const ctx: ScrubContext = {
    names: [s.identity.nom, s.identity.prenom],
    dictionary: medicalDictionary([z], intake),
  };
  // Copie dont seuls les textes libres sont nettoyés ; les libellés du contenu restent intacts.
  const notes = Object.fromEntries(Object.entries(s.notes).map(([k, v]) => [k, scrub(v, ctx)]));
  const psfs = s.intake.answers.psfs;
  const answers = Array.isArray(psfs)
    ? {
        ...s.intake.answers,
        psfs: (psfs as readonly PsfsItem[]).map((p) => ({ ...p, activity: scrub(p.activity, ctx) })),
      }
    : s.intake.answers;
  let clean: BilanState = { ...s, notes, intake: { ...s.intake, answers, original: {} } };
  let text = render(z, clean, intake, ignored);
  // Trop long pour l'IA (environ 6 000 tokens) : on raccourcit les notes les plus longues.
  for (let k = 0; k < 20 && text.length > MAX_CHARS; k++) {
    const [key, longest] = Object.entries(clean.notes).sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    if (!key || !longest || longest.length <= 400) break;
    const keep = Math.max(400, longest.length - (text.length - MAX_CHARS) - 20);
    clean = {
      ...clean,
      notes: { ...clean.notes, [key]: `${longest.slice(0, keep).trimEnd()} …[raccourci]` },
    };
    text = render(z, clean, intake, ignored);
  }
  return text;
}

/** Environ 6 000 tokens. */
const MAX_CHARS = 24_000;

function render(z: ZoneDef, clean: BilanState, intake: IntakeDef, ignored: readonly string[]): string {
  const lines = [`Zone : ${z.label}`];
  lines.push(...intakeLines(intake, clean).filter((l) => !l.startsWith('Accueil : ')));
  for (const sec of z.sections) {
    const l = sectionLines(sec, clean);
    if (l.length) lines.push(`${sec.title} :`, ...l.map((x) => `- ${x}`));
  }
  if (ignored.length) lines.push(`Déjà écarté : ${ignored.join(' ; ')}`);
  return lines.join('\n');
}
