// Nettoyage des textes libres avant tout envoi à l'IA ou copie pour Claude (spec IA §5.1).
// Approximatif par nature : l'aperçu modifiable laisse le dernier mot à Yass.
import { normalize } from '../engine/keywords';

export interface ScrubContext {
  /** Nom et prénom saisis dans l'identité du bilan. */
  names: readonly string[];
  /** Mots (normalisés) à ne jamais prendre pour des noms propres : libellés du contenu, anatomie, tests. */
  dictionary: ReadonlySet<string>;
}

const MONTHS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const DAYS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche';
const CITIES = [
  'Lausanne',
  'Genève',
  'Fribourg',
  'Neuchâtel',
  'Sion',
  'Yverdon',
  'Montreux',
  'Vevey',
  'Morges',
  'Nyon',
  'Renens',
  'Pully',
  'Bienne',
  'Delémont',
  'Martigny',
  'Monthey',
  'Bulle',
];

const RULES: readonly [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[e-mail]'],
  [/\b\d{4}-\d{2}-\d{2}\b/g, '[date]'],
  [/\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/g, '[date]'],
  [new RegExp(`\\b(\\d{1,2}(er)?\\s+)?(${MONTHS})(\\s+\\d{4})?\\b`, 'giu'), '[date]'],
  [new RegExp(`\\b(${DAYS})\\b`, 'giu'), '[date]'],
  // Après les dates, pour ne pas prendre « 12.03.2024 » pour un numéro.
  [/\+?\d[\d .]{7,}\d/g, '[téléphone]'],
  [/(?<![\p{L}])(rue|avenue|av\.|chemin|ch\.|route|place)(?![\p{L}])[^,\n]*/giu, '[lieu]'],
  [new RegExp(`(?<![\\p{L}])(${CITIES.join('|')})(?![\\p{L}])`, 'giu'), '[lieu]'],
];

const isTitle = (w: string) => /^\p{Lu}/u.test(w) && /\p{Ll}/u.test(w);

export function scrub(text: string, ctx: ScrubContext): string {
  let out = text;
  for (const [re, by] of RULES) out = out.replace(re, by);
  const nameWords = new Set(
    ctx.names.flatMap((n) => normalize(n).split(/[^\p{L}]+/u)).filter((w) => w.length >= 3),
  );
  out = out.replace(/\p{L}[\p{L}'’-]*/gu, (token, offset: number) => {
    const parts = token.split(/[-'’]/).filter(Boolean);
    if (parts.some((p) => nameWords.has(normalize(p)))) return '[nom]';
    if (!isTitle(token)) return token;
    // Début de phrase : rien avant, ou ponctuation de fin de phrase / retour à la ligne avant.
    const before = out.slice(0, offset).replace(/\s+$/, '');
    if (!before || /[.!?:\n]$/.test(before) || out.slice(0, offset).endsWith('\n')) return token;
    if (before.endsWith('[')) return token;
    if (parts.every((p) => ctx.dictionary.has(normalize(p)))) return token;
    return '[nom]';
  });
  // « [date] [date] » (ex. « lundi 12 mars ») → une seule fois.
  return out.replace(/(\[date\])(\s*\[date\])+/g, '$1');
}
