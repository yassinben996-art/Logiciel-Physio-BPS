// Coffre local des bilans : IndexedDB « bilan-vault », tout est chiffré.
// En clair, il ne reste que le sel et un vérificateur chiffré (pour reconnaître un mauvais PIN).
// Un PIN oublié rend les bilans irrécupérables : c'est voulu.
import type { BilanState } from '../state/bilan';
import { deriveKey, fromB64, open, seal, toB64, type Box } from './crypto';

const DB = 'bilan-vault';
const META = 'meta';
const BILANS = 'bilans';
const CHECK = 'bilan-vault-ok';

export interface BilanMeta {
  id: string;
  code: string;
  /** "Prénom Nom", ou le code si l'identité est vide. */
  label: string;
  zone: string;
  updatedAt: string;
}

export interface Vault {
  /** Triés par updatedAt décroissant. */
  list(): Promise<BilanMeta[]>;
  load(id: string): Promise<BilanState | null>;
  /** Met à jour updatedAt. */
  save(b: BilanState): Promise<void>;
  remove(id: string): Promise<void>;
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

function openDb(): Promise<IDBDatabase> {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore(META);
    r.result.createObjectStore(BILANS);
  };
  return req(r);
}

async function tx<T>(
  stores: string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  try {
    const t = db.transaction(stores, mode);
    const done = new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error ?? new Error('Transaction annulée'));
    });
    const out = await fn(t);
    await done;
    return out;
  } finally {
    db.close();
  }
}

const getMeta = <T>(key: string) =>
  tx([META], 'readonly', (t) => req(t.objectStore(META).get(key)) as Promise<T>);

export async function hasVault(): Promise<boolean> {
  return (await getMeta<string | undefined>('salt')) !== undefined;
}

const labelOf = (b: BilanState) =>
  [b.identity.prenom.trim(), b.identity.nom.trim()].filter(Boolean).join(' ') || b.code;

/** Un enregistrement = la fiche de la liste et le bilan, chiffrés séparément (la liste ne déchiffre que les fiches). */
interface Rec {
  meta: Box;
  data: Box;
}

// Pas d'index partagé : chaque bilan porte sa propre fiche. Deux onglets qui enregistrent en même temps
// n'écrivent jamais le même enregistrement, donc aucun bilan ne peut disparaître de « Mes bilans ».
function makeVault(key: CryptoKey): Vault {
  // Dans un même onglet, les écritures restent dans l'ordre (une sauvegarde plus ancienne n'écrase pas une plus récente).
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = queue.then(fn, fn);
    queue = p.catch(() => undefined);
    return p;
  };
  return {
    async list() {
      const recs = await tx(
        [BILANS],
        'readonly',
        (t) => req(t.objectStore(BILANS).getAll()) as Promise<Rec[]>,
      );
      const metas = await Promise.all(recs.map((r) => open<BilanMeta>(key, r.meta)));
      return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async load(id) {
      const rec = await tx(
        [BILANS],
        'readonly',
        (t) => req(t.objectStore(BILANS).get(id)) as Promise<Rec | undefined>,
      );
      return rec ? open<BilanState>(key, rec.data) : null;
    },
    save: (b) =>
      serial(async () => {
        const next: BilanState = { ...b, updatedAt: new Date().toISOString() };
        const meta: BilanMeta = {
          id: next.id,
          code: next.code,
          label: labelOf(next),
          zone: next.zone,
          updatedAt: next.updatedAt,
        };
        // Chiffrer avant d'ouvrir la transaction : une transaction IndexedDB se ferme dès qu'on attend autre chose.
        const [m, data] = await Promise.all([seal(key, meta), seal(key, next)]);
        const rec: Rec = { meta: m, data };
        await tx([BILANS], 'readwrite', (t) => {
          t.objectStore(BILANS).put(rec, next.id);
        });
      }),
    remove: (id) =>
      serial(async () => {
        await tx([BILANS], 'readwrite', (t) => {
          t.objectStore(BILANS).delete(id);
        });
      }),
  };
}

export async function createVault(pin: string): Promise<Vault> {
  if (!/^\d{6}$/.test(pin)) throw new Error('Le PIN doit comporter exactement 6 chiffres.');
  if (await hasVault()) throw new Error('Un coffre existe déjà sur cet appareil.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  const check = await seal(key, CHECK);
  await tx([META], 'readwrite', (t) => {
    const s = t.objectStore(META);
    s.put(toB64(salt), 'salt');
    s.put(check, 'check');
  });
  return makeVault(key);
}

export async function unlockVault(pin: string): Promise<Vault> {
  const salt = await getMeta<string | undefined>('salt');
  const check = await getMeta<Box | undefined>('check');
  if (!salt || !check) throw new Error('Aucun coffre sur cet appareil.');
  const key = await deriveKey(pin, fromB64(salt));
  try {
    if ((await open<string>(key, check)) !== CHECK) throw new Error();
  } catch {
    throw new Error('PIN incorrect');
  }
  return makeVault(key);
}
