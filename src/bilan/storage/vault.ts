// Coffre local des bilans : IndexedDB « bilan-vault », tout est chiffré.
// En clair, il ne reste que le sel, un vérificateur chiffré (pour reconnaître un mauvais PIN) et, par bilan,
// des métadonnées techniques de synchronisation (version, « à envoyer », « supprimé »), sans donnée patient.
//
// Clés : une CLÉ DE COFFRE aléatoire (AES-GCM 256) chiffre les bilans ; elle est commune à tous les appareils
// de Yass (transmise par le QR d'appairage, jamais par le relais). Sur chaque appareil, elle est stockée
// enveloppée par la clé dérivée du PIN de cet appareil. Un PIN oublié rend l'appareil illisible ; ses bilans
// reviennent du relais si l'appareil est relié à nouveau.
import { normalizeBilan, type BilanState } from '../state/bilan';
import { deriveKey, fromB64, importVaultKey, open, randomVaultKey, seal, toB64, type Box } from './crypto';

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
  /** Copie en conflit : id du bilan d'origine et date de la copie. */
  conflictOf?: string;
  conflictAt?: string;
}

export interface SyncMeta {
  /** Version attribuée par le relais (0 = jamais envoyé). */
  version: number;
  /** Modifié localement depuis le dernier envoi. */
  dirty: boolean;
  deleted: boolean;
}

export interface WireRecord {
  id: string;
  meta: Box;
  data: Box;
  version: number;
  deleted: boolean;
}

export interface Vault {
  /** Triés par updatedAt décroissant (sans les bilans supprimés). */
  list(): Promise<BilanMeta[]>;
  load(id: string): Promise<BilanState | null>;
  /** Met à jour updatedAt et marque le bilan « à envoyer ». */
  save(b: BilanState): Promise<void>;
  /** Supprime partout : laisse une tombe à envoyer. */
  remove(id: string): Promise<void>;
  /** La clé de coffre (pour le QR d'appairage). */
  keyBytes(): Uint8Array;
  /** Adopte la clé commune : rechiffre tout le coffre local avec elle (fusion, rien n'est perdu). */
  adoptKey(raw: Uint8Array): Promise<void>;
  getSyncConfig<T>(): Promise<T | null>;
  setSyncConfig<T>(c: T | null): Promise<void>;
  /** Enregistrements à envoyer au relais. */
  pending(): Promise<WireRecord[]>;
  /** Envoi réussi. Si le bilan a changé depuis (sentCt différent), il reste à envoyer avec la nouvelle version. */
  markSynced(id: string, version: number, sentCt?: string): Promise<void>;
  /** Applique un enregistrement venu du relais (voir la conception, §5.4). */
  applyRemote(r: WireRecord, isOpen: boolean): Promise<'applied' | 'copied' | 'skipped'>;
  /** Duplique le bilan local sous un nouvel id, marqué « copie en conflit », à envoyer. */
  keepAsConflictCopy(id: string, at: string): Promise<string>;
}

export interface VaultOpts {
  /** Base IndexedDB (par défaut celle du navigateur ; les tests simulent plusieurs appareils). */
  idb?: IDBFactory;
}

interface Rec {
  id?: string;
  meta: Box;
  data: Box;
  sync?: SyncMeta;
}

const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

function openDb(idb: IDBFactory): Promise<IDBDatabase> {
  const r = idb.open(DB, 1);
  r.onupgradeneeded = () => {
    r.result.createObjectStore(META);
    r.result.createObjectStore(BILANS);
  };
  return req(r);
}

async function tx<T>(
  idb: IDBFactory,
  stores: string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDb(idb);
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

const dbOf = (o?: VaultOpts) => o?.idb ?? indexedDB;
const getMeta = <T>(idb: IDBFactory, key: string) =>
  tx(idb, [META], 'readonly', (t) => req(t.objectStore(META).get(key)) as Promise<T>);

/** Tous les enregistrements avec leur clé (même ordre pour les clés et les valeurs dans une transaction). */
const allRecs = (idb: IDBFactory) =>
  tx(idb, [BILANS], 'readonly', async (t) => {
    const s = t.objectStore(BILANS);
    const [keys, values] = await Promise.all([req(s.getAllKeys()), req(s.getAll())]);
    return keys.map((k, i) => ({ id: String(k), rec: values[i] as Rec }));
  });
const getRec = (idb: IDBFactory, id: string) =>
  tx(idb, [BILANS], 'readonly', (t) => req(t.objectStore(BILANS).get(id)) as Promise<Rec | undefined>);
const putRec = (idb: IDBFactory, id: string, rec: Rec) =>
  tx(idb, [BILANS], 'readwrite', (t) => {
    t.objectStore(BILANS).put({ ...rec, id }, id);
  });

const syncOf = (r: Rec): SyncMeta => r.sync ?? { version: 0, dirty: true, deleted: false };

export async function hasVault(o?: VaultOpts): Promise<boolean> {
  return (await getMeta<string | undefined>(dbOf(o), 'salt')) !== undefined;
}

const labelOf = (b: BilanState) =>
  [b.identity.prenom.trim(), b.identity.nom.trim()].filter(Boolean).join(' ') || b.code;

function makeVault(idb: IDBFactory, pinKey: CryptoKey, initialRaw: Uint8Array, initialKey: CryptoKey): Vault {
  let raw = initialRaw;
  let key = initialKey;
  // Dans un même onglet, les écritures restent dans l'ordre.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const p = queue.then(fn, fn);
    queue = p.catch(() => undefined);
    return p;
  };

  const metaFor = (b: BilanState, extra: Partial<BilanMeta> = {}): BilanMeta => ({
    id: b.id,
    code: b.code,
    label: labelOf(b),
    zone: b.zone,
    updatedAt: b.updatedAt,
    ...extra,
  });
  const conflictPart = (m: BilanMeta): Partial<BilanMeta> =>
    m.conflictOf ? { conflictOf: m.conflictOf, conflictAt: m.conflictAt } : {};

  /** Copie d'un bilan (déchiffré) sous un nouvel id, marquée en conflit. */
  async function writeCopy(b: BilanState, of: string, at: string): Promise<string> {
    const id = crypto.randomUUID();
    const copy: BilanState = { ...b, id };
    const [m, d] = await Promise.all([
      seal(key, metaFor(copy, { conflictOf: of, conflictAt: at })),
      seal(key, copy),
    ]);
    await putRec(idb, id, { meta: m, data: d, sync: { version: 0, dirty: true, deleted: false } });
    return id;
  }

  return {
    async list() {
      const recs = await allRecs(idb);
      const metas = await Promise.all(
        recs.filter((x) => !syncOf(x.rec).deleted).map((x) => open<BilanMeta>(key, x.rec.meta)),
      );
      return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async load(id) {
      const rec = await getRec(idb, id);
      if (!rec || syncOf(rec).deleted) return null;
      return normalizeBilan(await open<unknown>(key, rec.data));
    },
    save: (b) =>
      serial(async () => {
        const next: BilanState = { ...b, updatedAt: new Date().toISOString() };
        const prev = await getRec(idb, next.id);
        const prevMeta = prev && !syncOf(prev).deleted ? await open<BilanMeta>(key, prev.meta) : null;
        // Chiffrer avant d'ouvrir la transaction : une transaction IndexedDB se ferme dès qu'on attend autre chose.
        const [m, data] = await Promise.all([
          seal(key, metaFor(next, prevMeta ? conflictPart(prevMeta) : {})),
          seal(key, next),
        ]);
        const version = prev ? syncOf(prev).version : 0;
        await putRec(idb, next.id, { meta: m, data, sync: { version, dirty: true, deleted: false } });
      }),
    remove: (id) =>
      serial(async () => {
        const prev = await getRec(idb, id);
        if (!prev) return;
        const [m, d] = await Promise.all([seal(key, { id, deleted: true }), seal(key, null)]);
        await putRec(idb, id, {
          meta: m,
          data: d,
          sync: { version: syncOf(prev).version, dirty: true, deleted: true },
        });
      }),
    keyBytes: () => new Uint8Array(raw),
    adoptKey: (newRaw) =>
      serial(async () => {
        const newKey = await importVaultKey(newRaw);
        const recs = await allRecs(idb);
        const resealed = await Promise.all(
          recs.map(async ({ id, rec }) => ({
            id,
            rec: {
              meta: await seal(newKey, await open<unknown>(key, rec.meta)),
              data: await seal(newKey, await open<unknown>(key, rec.data)),
              sync: { ...syncOf(rec), dirty: true },
            } as Rec,
          })),
        );
        const cfg = await getMeta<Box | undefined>(idb, 'sync');
        const cfgBox = cfg ? await seal(newKey, await open<unknown>(key, cfg)) : undefined;
        const wrapped = await seal(pinKey, toB64(newRaw));
        await tx(idb, [META, BILANS], 'readwrite', (t) => {
          for (const x of resealed) t.objectStore(BILANS).put({ ...x.rec, id: x.id }, x.id);
          t.objectStore(META).put(wrapped, 'vaultKey');
          if (cfgBox) t.objectStore(META).put(cfgBox, 'sync');
        });
        raw = new Uint8Array(newRaw);
        key = newKey;
      }),
    async getSyncConfig<T>() {
      const box = await getMeta<Box | undefined>(idb, 'sync');
      return box ? ((await open<T | null>(key, box)) ?? null) : null;
    },
    setSyncConfig: (c) =>
      serial(async () => {
        if (c === null) {
          await tx(idb, [META], 'readwrite', (t) => {
            t.objectStore(META).delete('sync');
          });
          return;
        }
        const box = await seal(key, c);
        await tx(idb, [META], 'readwrite', (t) => {
          t.objectStore(META).put(box, 'sync');
        });
      }),
    async pending() {
      return (await allRecs(idb))
        .filter((x) => syncOf(x.rec).dirty)
        .map((x) => ({
          id: x.id,
          meta: x.rec.meta,
          data: x.rec.data,
          version: syncOf(x.rec).version,
          deleted: syncOf(x.rec).deleted,
        }));
    },
    markSynced: (id, version, sentCt) =>
      serial(async () => {
        const rec = await getRec(idb, id);
        if (!rec) return;
        const changed = sentCt !== undefined && rec.data.ct !== sentCt;
        await putRec(idb, id, { ...rec, sync: { ...syncOf(rec), version, dirty: changed } });
      }),
    applyRemote: (r, isOpen) =>
      serial(async () => {
        const local = await getRec(idb, r.id);
        const ls = local ? syncOf(local) : null;
        if (local && ls && isOpen && r.version !== ls.version) {
          // Bilan ouvert à l'écran : jamais remplacé. La version distante est gardée comme copie,
          // et le bilan ouvert prend la version distante comme base, pour l'écraser au prochain envoi.
          if (!r.deleted) {
            const remote = normalizeBilan(await open<unknown>(key, r.data));
            await writeCopy(remote, r.id, new Date().toISOString());
          }
          await putRec(idb, r.id, { ...local, sync: { ...ls, version: r.version, dirty: true } });
          return r.deleted ? 'skipped' : 'copied';
        }
        // Modifié ici et pas encore envoyé : c'est l'envoi (réponse 409) qui tranchera.
        if (ls?.dirty) return 'skipped';
        await putRec(idb, r.id, {
          meta: r.meta,
          data: r.data,
          sync: { version: r.version, dirty: false, deleted: r.deleted },
        });
        return 'applied';
      }),
    keepAsConflictCopy: (id, at) =>
      serial(async () => {
        const rec = await getRec(idb, id);
        if (!rec || syncOf(rec).deleted) throw new Error('bilan introuvable');
        return writeCopy(normalizeBilan(await open<unknown>(key, rec.data)), id, at);
      }),
  };
}

export async function createVault(pin: string, o?: VaultOpts): Promise<Vault> {
  const idb = dbOf(o);
  if (!/^\d{6}$/.test(pin)) throw new Error('Le PIN doit comporter exactement 6 chiffres.');
  if (await hasVault(o)) throw new Error('Un coffre existe déjà sur cet appareil.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const pinKey = await deriveKey(pin, salt);
  const raw = randomVaultKey();
  const [check, wrapped, key] = await Promise.all([
    seal(pinKey, CHECK),
    seal(pinKey, toB64(raw)),
    importVaultKey(raw),
  ]);
  await tx(idb, [META], 'readwrite', (t) => {
    const s = t.objectStore(META);
    s.put(toB64(salt), 'salt');
    s.put(check, 'check');
    s.put(wrapped, 'vaultKey');
  });
  return makeVault(idb, pinKey, raw, key);
}

export async function unlockVault(pin: string, o?: VaultOpts): Promise<Vault> {
  const idb = dbOf(o);
  const salt = await getMeta<string | undefined>(idb, 'salt');
  const check = await getMeta<Box | undefined>(idb, 'check');
  if (!salt || !check) throw new Error('Aucun coffre sur cet appareil.');
  const pinKey = await deriveKey(pin, fromB64(salt));
  try {
    if ((await open<string>(pinKey, check)) !== CHECK) throw new Error();
  } catch {
    throw new Error('PIN incorrect');
  }
  const wrapped = await getMeta<Box | undefined>(idb, 'vaultKey');
  if (wrapped) {
    const raw = fromB64(await open<string>(pinKey, wrapped));
    return makeVault(idb, pinKey, raw, await importVaultKey(raw));
  }
  // Coffre des plans 1 et 1b : bilans scellés par la clé du PIN. On crée la clé de coffre et on rechiffre tout.
  const raw = randomVaultKey();
  const key = await importVaultKey(raw);
  const recs = await allRecs(idb);
  const migrated = await Promise.all(
    recs.map(async ({ id, rec }) => ({
      id,
      rec: {
        id,
        meta: await seal(key, await open<unknown>(pinKey, rec.meta)),
        data: await seal(key, await open<unknown>(pinKey, rec.data)),
        sync: { version: 0, dirty: true, deleted: false },
      } as Rec,
    })),
  );
  const newWrapped = await seal(pinKey, toB64(raw));
  await tx(idb, [META, BILANS], 'readwrite', (t) => {
    for (const x of migrated) t.objectStore(BILANS).put(x.rec, x.id);
    t.objectStore(META).put(newWrapped, 'vaultKey');
  });
  return makeVault(idb, pinKey, raw, key);
}
