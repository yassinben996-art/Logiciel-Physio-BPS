// Questionnaires à domicile : lien du QR code et chiffrement des réponses du patient.
// La clé n'existe que dans le lien (après « # », jamais envoyée à un serveur) et dans le bilan chiffré.
import { QUESTIONNAIRES } from '../../questionnaires/public';
import { importVaultKey, open, seal, type Box } from '../storage/crypto';

/** Durée de validité du lien (le relais l'applique aussi). */
export const HOMEQ_DAYS = 14;

/** Réponses par questionnaire : id d'item → valeur (et « item# » → index de l'option choisie). */
export type HomeAnswers = Record<string, Record<string, number>>;

const b64url = (b: Uint8Array) => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) =>
    c.charCodeAt(0),
  );

const KNOWN = new Set(QUESTIONNAIRES.map((q) => q.id));

export const newHomeKey = (): string => b64url(crypto.getRandomValues(new Uint8Array(32)));

export const homeLink = (base: string, p: { ticket: string; key: string; ids: readonly string[] }): string =>
  `${base}#/q?t=${p.ticket}&k=${p.key}&q=${p.ids.join(',')}`;

export function parseHomeLink(hash: string): { ticket: string; key: string; ids: string[] } | null {
  const m = /^#\/q\?(.*)$/.exec(hash);
  if (!m) return null;
  const p = new URLSearchParams(m[1]);
  const ticket = p.get('t') ?? '';
  const key = p.get('k') ?? '';
  const ids = (p.get('q') ?? '').split(',').filter((id) => KNOWN.has(id));
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(ticket) || !/^[A-Za-z0-9_-]{43}$/.test(key) || !ids.length) return null;
  return { ticket, key, ids: [...new Set(ids)] };
}

const keyOf = (key: string) => importVaultKey(fromB64url(key));

export const sealAnswers = async (key: string, a: HomeAnswers): Promise<Box> => seal(await keyOf(key), a);

/** Rejette si la clé est mauvaise ou la boîte altérée. */
export const openAnswers = async (key: string, b: Box): Promise<HomeAnswers> =>
  open<HomeAnswers>(await keyOf(key), b);

export async function ticketHash(ticket: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ticket)));
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('');
}
