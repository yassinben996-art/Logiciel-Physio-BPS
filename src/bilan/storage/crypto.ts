// Chiffrement local : WebCrypto uniquement, aucune dépendance.
// Clé AES-GCM 256 dérivée du PIN par PBKDF2-SHA256 (600 000 itérations, sel aléatoire de 16 octets).

export const PBKDF2_ITERATIONS = 600_000;

export interface Box {
  iv: string;
  ct: string;
}

export const toB64 = (b: Uint8Array): string => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};

export const fromB64 = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: PBKDF2_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, data: unknown): Promise<Box> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

/** Rejette si la clé est mauvaise ou si les données ont été altérées. */
export async function open<T>(key: CryptoKey, box: Box): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, key, fromB64(box.ct));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

/** Nouvelle clé de coffre : 32 octets aléatoires. */
export const randomVaultKey = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(32));

/** Importe la clé de coffre (AES-GCM 256, non extractible : on garde les octets bruts à part pour l'appairage). */
export function importVaultKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new Uint8Array(raw), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}
