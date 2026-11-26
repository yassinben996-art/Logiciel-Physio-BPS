// Code d'appairage : ticket du relais (8 octets) + clé de coffre (32 octets), en base32 Crockford.
// La clé ne passe jamais par le relais : elle voyage dans le QR code ou dans le code tapé à la main.

export interface PairingPayload {
  /** 8 octets. */
  ticket: Uint8Array;
  /** 32 octets. */
  key: Uint8Array;
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const BAD = 'Code incorrect : vérifie la saisie';
const BYTES = 40;
const DATA_CHARS = 64; // 40 octets × 8 / 5

/** CRC-16/CCITT-FALSE. */
function crc16(b: Uint8Array): number {
  let c = 0xffff;
  for (const x of b) {
    c ^= x << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c;
}

function toBase32(b: Uint8Array): string {
  let out = '';
  let acc = 0;
  let bits = 0;
  for (const x of b) {
    acc = (acc << 8) | x;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(acc >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(acc << (5 - bits)) & 31];
  return out;
}

function fromBase32(s: string): Uint8Array {
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error(BAD);
    acc = ((acc << 5) | v) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

const checkChars = (b: Uint8Array) => {
  const c = crc16(b);
  return [15, 10, 5, 0].map((s) => ALPHABET[(c >> s) & 31]).join('');
};

export function encodePairing(p: PairingPayload): string {
  if (p.ticket.length !== 8 || p.key.length !== 32) throw new Error('appairage : tailles inattendues');
  const bytes = new Uint8Array(BYTES);
  bytes.set(p.ticket, 0);
  bytes.set(p.key, 8);
  const all = toBase32(bytes) + checkChars(bytes);
  return all.match(/.{4}/g)!.join('-');
}

export function decodePairing(code: string): PairingPayload {
  const s = code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== DATA_CHARS + 4) throw new Error(BAD);
  const bytes = fromBase32(s.slice(0, DATA_CHARS));
  if (bytes.length !== BYTES || checkChars(bytes) !== s.slice(DATA_CHARS)) throw new Error(BAD);
  return { ticket: bytes.slice(0, 8), key: bytes.slice(8) };
}

export const pairingLink = (code: string, base: string): string => `${base}#/bilan/relier?c=${code}`;

export function codeFromHash(hash: string): string | null {
  const m = /^#\/bilan\/relier\?(.*)$/.exec(hash);
  if (!m) return null;
  return new URLSearchParams(m[1]).get('c') || null;
}
