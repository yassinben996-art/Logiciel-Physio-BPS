// Détection de mots-clés dans les notes libres, sur l'appareil. Elle PROPOSE de cocher une pastille ;
// le clinicien confirme toujours (spec §5.4). Une négation proche est signalée, pas interprétée.
import type { ZoneDef } from '../content/types';
import type { BilanState } from '../state/bilan';

export interface KeywordHit {
  /** "s.f.chip" */
  key: string;
  label: string;
  /** Texte tel qu'il a été saisi. */
  matched: string;
  possiblyNegated: boolean;
  /** Note où le mot a été trouvé ("s.notes"), pour afficher l'invite sous le bon champ. */
  note: string;
}

const NEGATIONS = new Set(['pas', 'sans', 'aucun', 'aucune', 'jamais', 'ni']);
const NEG_WINDOW = 3;

/** Minuscules, sans accents. */
export const normalize = (t: string): string => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Token {
  norm: string;
  start: number;
  end: number;
}

const tokenize = (text: string): Token[] =>
  [...text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({
    norm: normalize(m[0]),
    start: m.index,
    end: m.index + m[0].length,
  }));

/**
 * Cherche un mot-clé (un ou plusieurs mots). Chaque mot du mot-clé doit commencer un mot du texte :
 * « fourmillement » reconnaît « fourmillements », « nuit » reconnaît « nuitamment » (préfixe accepté,
 * le clinicien confirme). Renvoie la première occurrence affirmée, sinon la première niée.
 */
function find(tokens: Token[], text: string, keyword: string): { matched: string; negated: boolean } | null {
  const kw = normalize(keyword)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (!kw.length) return null;
  let negatedHit: { matched: string; negated: boolean } | null = null;
  for (let i = 0; i + kw.length <= tokens.length; i++) {
    if (!kw.every((k, j) => tokens[i + j]!.norm.startsWith(k))) continue;
    const negated = tokens.slice(Math.max(0, i - NEG_WINDOW), i).some((t) => NEGATIONS.has(t.norm));
    const matched = text.slice(tokens[i]!.start, tokens[i + kw.length - 1]!.end);
    if (!negated) return { matched, negated };
    negatedHit ??= { matched, negated };
  }
  return negatedHit;
}

export function detectKeywords(z: ZoneDef, s: BilanState): KeywordHit[] {
  const notes = Object.entries(s.notes)
    .filter(([, t]) => t.trim() !== '')
    .map(([key, text]) => ({ key, text, tokens: tokenize(text) }));
  if (!notes.length) return [];
  const hits: KeywordHit[] = [];
  for (const sec of z.sections) {
    for (const f of sec.fields) {
      if (f.kind !== 'chips') continue;
      for (const c of f.chips) {
        const key = `${sec.id}.${f.id}.${c.id}`;
        if (!c.keywords?.length || s.chips[key] || s.dismissed.includes(`kw:${key}`)) continue;
        let best: KeywordHit | null = null;
        for (const n of notes) {
          for (const kw of c.keywords) {
            const r = find(n.tokens, n.text, kw);
            if (!r) continue;
            if (!best || (best.possiblyNegated && !r.negated))
              best = { key, label: c.label, matched: r.matched, possiblyNegated: r.negated, note: n.key };
            if (!best.possiblyNegated) break;
          }
          if (best && !best.possiblyNegated) break;
        }
        if (best) hits.push(best);
      }
    }
  }
  return hits;
}
