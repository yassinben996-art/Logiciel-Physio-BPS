// Résumé du bilan envoyé à l'IA ou copié pour Claude : aucune identité, aucun code, aucune date de l'état ;
// textes libres nettoyés : nom, prénom, téléphone et e-mail du patient (spec IA §5.1).
import type { IntakeDef, ZoneDef } from '../content/types';
import { questionnaireLines, sectionLines } from '../engine/exports';
import { intakeLines } from '../engine/intakeText';
import type { BilanState, PsfsItem } from '../state/bilan';
import { scrub, type ScrubContext } from './scrub';

export function buildSummary(
  z: ZoneDef,
  s: BilanState,
  intake: IntakeDef,
  ignored: readonly string[] = [],
): string {
  const ctx: ScrubContext = { names: [s.identity.nom, s.identity.prenom] };
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
  const ql = questionnaireLines(clean);
  if (ql.length) lines.push('Questionnaires :', ...ql.map((x) => `- ${x}`));
  if (ignored.length) lines.push(`Déjà écarté : ${ignored.join(' ; ')}`);
  return lines.join('\n');
}
