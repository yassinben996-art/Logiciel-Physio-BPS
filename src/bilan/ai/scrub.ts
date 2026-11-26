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
  // Forme d'un numéro suisse ou international (0… ou +41…), pas une liste de mesures (« 170 160 150 »).
  [/(?:\+\d{2}[ .]?|\b0)\d(?:[ .]?\d){7,}/g, '[téléphone]'],
  // Adresse : un mot de rue suivi d'un nom propre ou d'un numéro (« rue de Bourg 3 », pas « mise en place d'exercices »).
  [
    /(?<![\p{L}])(?:[Rr]ue|[Aa]venue|[Aa]v\.|[Cc]hemin|[Cc]h\.|[Rr]oute|[Pp]lace)\s+(?:(?:de la|des|du|de|d['’])\s*)?(?=[\p{Lu}\d])[^,\n]*/gu,
    '[lieu]',
  ],
  [new RegExp(`(?<![\\p{L}])(${CITIES.join('|')})(?![\\p{L}])`, 'giu'), '[lieu]'],
];

const TITLES = /^(?:Dr|Dre|Mme|Mlle|Me|Pr|Prof|St|Ste)$/;
const isTitle = (w: string) => /^\p{Lu}/u.test(w) && /\p{Ll}/u.test(w);

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
  out = out.replace(/\p{L}[\p{L}'’-]*/gu, (token, offset: number) => {
    const parts = token.split(/[-'’]/).filter(Boolean);
    if (parts.some((p) => nameWords.has(normalize(p)))) return '[nom]';
    if (!isTitle(token)) return token;
    if (TITLES.test(token) && out[offset + token.length] === '.') return token; // « Dr. », « Mme. »
    // Début de phrase : rien avant, ou ponctuation de fin de phrase / retour à la ligne avant.
    const before = out.slice(0, offset).replace(/\s+$/, '');
    // « Dr. Martin », « M. Wu » : le point d'une abréviation n'ouvre pas une phrase. Après « : », un nom propre
    // est probable (« Médecin traitant : Durand »).
    const abbreviation = /(?:^|[^\p{L}])(?:Dr|Dre|M|Mme|Mlle|Me|Pr|Prof|St|Ste)\.$/u.test(before);
    if (!before || (/[.!?\n]$/.test(before) && !abbreviation) || out.slice(0, offset).endsWith('\n'))
      return token;
    if (before.endsWith('[')) return token;
    if (parts.every((p) => ctx.dictionary.has(normalize(p)))) return token;
    return '[nom]';
  });
  // « [date] [date] » (ex. « lundi 12 mars ») → une seule fois.
  return out.replace(/(\[date\])(\s*\[date\])+/g, '$1');
}
