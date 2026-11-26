// Lecture tolérante de la réponse de l'IA : on n'affiche que ce qui est valide, au plus 5 suggestions.
import type { ZoneDef } from '../content/types';
import { normalize } from '../engine/keywords';

export type AiKind = 'hypothese' | 'test' | 'questionnaire' | 'drapeau';
export interface AiSuggestion {
  id: string;
  kind: AiKind;
  label: string;
  reason: string;
  /** "s.f" d'un test du contenu, ou id d'un questionnaire de la banque. */
  target?: string;
}

const KINDS: readonly AiKind[] = ['hypothese', 'test', 'questionnaire', 'drapeau'];
const BAD = 'L’IA a répondu de façon inattendue';
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Le premier objet JSON équilibré du texte (même entouré de texte ou de ```json). */
function firstJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error(BAD);
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch (e) {
        throw new Error(BAD, { cause: e });
      }
    }
  }
  throw new Error(BAD);
}

function testTarget(z: ZoneDef, label: string): string | undefined {
  const l = normalize(label);
  for (const sec of z.sections)
    for (const f of sec.fields) {
      if (f.kind !== 'test') continue;
      const t = normalize(f.label);
      if (t.length >= 3 && (l.includes(t) || t.includes(l))) return `${sec.id}.${f.id}`;
    }
  return undefined;
}

function questionnaireTarget(label: string, qs: readonly { id: string; name: string }[]): string | undefined {
  const l = normalize(label);
  const word = (w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, '')}([^a-z0-9]|$)`).test(l);
  return qs.find((q) => word(normalize(q.id)) || l.includes(normalize(q.name)))?.id;
}

export function parseAiResponse(
  text: string,
  z: ZoneDef,
  knownQuestionnaires: readonly { id: string; name: string }[],
): AiSuggestion[] {
  const obj = firstJsonObject(text) as { suggestions?: unknown };
  const list = Array.isArray(obj?.suggestions) ? (obj.suggestions as unknown[]) : [];
  const out: AiSuggestion[] = [];
  for (const raw of list) {
    if (out.length >= 5) break;
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as { type?: unknown; label?: unknown; reason?: unknown };
    const kind = typeof r.type === 'string' ? (normalize(r.type) as AiKind) : null;
    const label = typeof r.label === 'string' ? r.label.trim() : '';
    if (!kind || !KINDS.includes(kind) || !label) continue;
    const s: AiSuggestion = {
      id: `ai-${out.length}-${normalize(label)
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 24)}`,
      kind,
      label: clip(label, 120),
      reason: clip(typeof r.reason === 'string' ? r.reason.trim() : '', 240),
    };
    const target =
      kind === 'test'
        ? testTarget(z, label)
        : kind === 'questionnaire'
          ? questionnaireTarget(label, knownQuestionnaires)
          : undefined;
    out.push(target ? { ...s, target } : s);
  }
  if (!out.length) throw new Error(BAD);
  return out;
}
