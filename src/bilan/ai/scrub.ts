// Nettoyage des textes libres avant tout envoi à l'IA ou copie pour Claude (spec IA §5.1, assoupli le 26.11.2026 :
// Yass veut que l'IA lise tout, noms de tests, dates, lieux et tiers compris). Seuls restent masqués le nom et le
// prénom du patient, son téléphone et son e-mail. L'aperçu modifiable laisse le dernier mot à Yass.
import { normalize } from '../engine/keywords';

export interface ScrubContext {
  /** Nom et prénom saisis dans l'identité du bilan. */
  names: readonly string[];
}

const RULES: readonly [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail]'],
  // Forme d'un numéro suisse ou international (0… ou +41…), pas une liste de mesures (« 170 160 150 »)
  // ni une date (« 12.03.2024 »).
  [/(?:\+\d{2}[ .]?|\b0)\d(?:[ .]?\d){7,}/g, '[téléphone]'],
];

export function scrub(text: string, ctx: ScrubContext): string {
  let out = text;
  for (const [re, by] of RULES) out = out.replace(re, by);
  // Mots du nom et du prénom (même courts : « Li », « Wu »), et chaque nom écrit d'un seul tenant (« bensaïd »).
  const nameWords = new Set(
    ctx.names.flatMap((n) => {
      const ws = normalize(n)
        .split(/[^\p{L}]+/u)
        .filter((w) => w.length >= 2);
      return ws.length > 1 ? [...ws, ws.join('')] : ws;
    }),
  );
  if (nameWords.size === 0) return out;
  return out.replace(/\p{L}[\p{L}'’-]*/gu, (token) =>
    token
      .split(/[-'’]/)
      .filter(Boolean)
      .some((p) => nameWords.has(normalize(p)))
      ? '[nom]'
      : token,
  );
}
