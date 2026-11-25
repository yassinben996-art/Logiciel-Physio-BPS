// Texte de l'accueil pour les exports (bloc SYSmeta « Anamnèse » et PDF).
import { regionsOf } from '../bodychart/geometry';
import type { IntakeDef, IntakeQuestion } from '../content/types';
import { fr } from '../../engine/format';
import { LABEL_STATUS, type BilanState, type IntakeValue, type PsfsItem } from '../state/bilan';

/** Une question « single » avec showIf n'est posée que si la condition est remplie. */
export function isVisible(q: IntakeQuestion, s: BilanState): boolean {
  if (q.kind !== 'single' || !q.showIf) return true;
  const v = s.intake.answers[q.showIf.id];
  return Array.isArray(v) && (v as readonly string[]).includes(q.showIf.includes);
}

const frDate = (iso: string) => new Date(iso).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' });

/** Valeur lisible d'une réponse, ou '' si vide. */
export function formatIntakeValue(q: IntakeQuestion, v: IntakeValue | undefined): string {
  if (v === undefined) return '';
  switch (q.kind) {
    case 'multi':
      return Array.isArray(v)
        ? (v as readonly string[]).map((x) => q.options.find((o) => o.value === x)?.label ?? x).join(', ')
        : '';
    case 'single':
      return typeof v === 'string' ? (q.options.find((o) => o.value === v)?.label ?? v) : '';
    case 'scale':
      return typeof v === 'number' ? fr(v) : '';
    case 'yesno':
      return typeof v === 'string' ? v : '';
    case 'psfs':
      return Array.isArray(v)
        ? (v as readonly PsfsItem[])
            .filter((x) => x.activity.trim() !== '')
            .map((x) => `${x.activity.trim()} ${x.score === null ? 'non noté' : `${fr(x.score)}/10`}`)
            .join(' ; ')
        : '';
    case 'bodychart':
      return '';
  }
}

const same = (a: IntakeValue | undefined, b: IntakeValue | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Une ligne par réponse remplie, dans l'ordre du contenu ; [] si l'accueil est vide. */
export function intakeLines(intake: IntakeDef, s: BilanState): string[] {
  const i = s.intake;
  const lines: string[] = [];
  for (const q of intake.questions) {
    if (q.kind === 'bodychart') {
      for (const p of intake.pens) {
        const regions = regionsOf(i.strokes, p.id);
        if (regions.length) lines.push(`${p.label} : ${regions.map((r) => r.label).join(', ')}`);
      }
      continue;
    }
    // Une question masquée (ex. côté alors que l'épaule n'est plus cochée) n'est pas exportée.
    if (!isVisible(q, s)) continue;
    const text = formatIntakeValue(q, i.answers[q.id]);
    if (!text) continue;
    const orig = i.original[q.id];
    const corrected = orig !== undefined && !same(orig, i.answers[q.id]);
    lines.push(
      `${q.clinician} : ${text}${corrected ? ` (patient : ${formatIntakeValue(q, orig) || 'sans réponse'})` : ''}`,
    );
  }
  if (!lines.length && !i.strokes.length) return [];
  const status = `Accueil : ${LABEL_STATUS[i.status]}${i.status === 'patient' && i.patientAt ? ` le ${frDate(i.patientAt)}` : ''}`;
  return [status, ...lines];
}
