import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { createVault, hasVault, unlockVault } from '../src/bilan/storage/vault';
import { open, seal, deriveKey } from '../src/bilan/storage/crypto';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const sample = (): BilanState => ({
  ...emptyBilan('shoulder'),
  identity: { nom: 'Dupont', prenom: 'Marie', naissance: '1980-03-05' },
  notes: { 'anamnese.notes': 'fourmillements la nuit' },
  nums: { 'mobilite.abd_a.D': 150 },
});

function rawDump(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bilan-vault');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['meta', 'bilans'], 'readonly');
      const out: unknown[] = [];
      for (const name of ['meta', 'bilans']) {
        const r = tx.objectStore(name).getAll();
        r.onsuccess = () => out.push(r.result);
      }
      tx.oncomplete = () => {
        db.close();
        resolve(JSON.stringify(out));
      };
    };
  });
}

describe('crypto', () => {
  it('seal / open, mauvaise clé rejetée', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const k = await deriveKey('123456', salt);
    const box = await seal(k, { a: 1 });
    expect(await open<{ a: number }>(k, box)).toEqual({ a: 1 });
    await expect(open(await deriveKey('654321', salt), box)).rejects.toThrow();
  });
});

describe('coffre', () => {
  it('création, sauvegarde, rechargement, déverrouillage, liste, suppression', async () => {
    expect(await hasVault()).toBe(false);
    const v = await createVault('123456');
    expect(await hasVault()).toBe(true);
    const b = sample();
    await v.save(b);
    const loaded = await v.load(b.id);
    expect({ ...loaded, updatedAt: '' }).toEqual({ ...b, updatedAt: '' });

    await expect(unlockVault('000000')).rejects.toThrow('PIN incorrect');

    const v2 = await unlockVault('123456');
    const list = await v2.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: b.id, code: b.code, label: 'Marie Dupont', zone: 'shoulder' });

    const raw = await rawDump();
    expect(raw).not.toContain('Dupont');
    expect(raw).not.toContain('fourmillements');
    expect(raw).not.toContain(b.code);

    await v2.remove(b.id);
    expect(await v2.load(b.id)).toBeNull();
    expect(await v2.list()).toEqual([]);
  }, 20000);

  it('liste triée par date de modification, libellé = code sans identité', async () => {
    const v = await createVault('123456');
    const a = emptyBilan('shoulder');
    const b = emptyBilan('shoulder');
    await v.save(a);
    await new Promise((r) => setTimeout(r, 5));
    await v.save(b);
    const list = await v.list();
    expect(list.map((m) => m.id)).toEqual([b.id, a.id]);
    expect(list[0]!.label).toBe(b.code);
  }, 20000);

  it('PIN invalide à la création', async () => {
    await expect(createVault('12a')).rejects.toThrow();
    await expect(createVault('1234567')).rejects.toThrow();
    expect(await hasVault()).toBe(false);
  });

  it('déverrouiller sans coffre rejette', async () => {
    await expect(unlockVault('123456')).rejects.toThrow();
  });

  it('deux onglets qui enregistrent en même temps : aucun bilan ne disparaît de la liste', async () => {
    await createVault('123456');
    const [t1, t2] = await Promise.all([unlockVault('123456'), unlockVault('123456')]);
    const a = emptyBilan('shoulder');
    const b = emptyBilan('shoulder');
    await Promise.all([t1.save(a), t2.save(b)]);
    expect((await t1.list()).map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
  }, 30000);

  it('un bilan enregistré au plan 1 (sans accueil) se recharge avec l’accueil vide', async () => {
    const v = await createVault('123456');
    const { intake: _i, ...old } = emptyBilan('shoulder');
    void _i;
    await v.save(old as unknown as BilanState);
    const loaded = await v.load(old.id);
    expect(loaded!.intake.status).toBe('none');
    expect(loaded!.intake.answers).toEqual({});
  }, 20000);
});

// ---------- Synchronisation : clé de coffre commune, métadonnées ----------

/** Écrit à la main un coffre au format des plans 1 et 1b (bilans scellés par la clé du PIN, pas de vaultKey). */
async function legacyVault(idb: IDBFactory, pin: string, bilans: BilanState[]) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await deriveKey(pin, salt);
  const check = await seal(k, 'bilan-vault-ok');
  const recs = await Promise.all(
    bilans.map(async (b) => ({
      id: b.id,
      rec: {
        meta: await seal(k, { id: b.id, code: b.code, label: b.code, zone: b.zone, updatedAt: b.updatedAt }),
        data: await seal(k, b),
      },
    })),
  );
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  await new Promise<void>((resolve, reject) => {
    const r = idb.open('bilan-vault', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('meta');
      r.result.createObjectStore('bilans');
    };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const db = r.result;
      const t = db.transaction(['meta', 'bilans'], 'readwrite');
      t.objectStore('meta').put(b64(salt), 'salt');
      t.objectStore('meta').put(check, 'check');
      for (const x of recs) t.objectStore('bilans').put(x.rec, x.id);
      t.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
}

describe('coffre : clé commune et synchronisation', () => {
  it('migration d’un coffre des plans 1 et 1b', async () => {
    const idb = new IDBFactory();
    const b = sample();
    await legacyVault(idb, '123456', [b]);
    const v = await unlockVault('123456', { idb });
    expect((await v.list()).map((m) => m.id)).toEqual([b.id]);
    expect((await v.load(b.id))!.notes).toEqual(b.notes);
    await expect(unlockVault('000000', { idb })).rejects.toThrow('PIN incorrect');
    const again = await unlockVault('123456', { idb });
    expect((await again.load(b.id))!.identity.nom).toBe('Dupont');
    expect(again.keyBytes()).toEqual(v.keyBytes());
    expect((await again.pending()).map((p) => p.id)).toEqual([b.id]);
  }, 20000);

  it('deux appareils : même clé, un bilan transmis se lit', async () => {
    const A = await createVault('123456', { idb: new IDBFactory() });
    const B = await createVault('654321', { idb: new IDBFactory() });
    const own = { ...emptyBilan('shoulder'), notes: { 'plan.notes': 'à B' } };
    await B.save(own);
    const b = sample();
    await A.save(b);
    await B.adoptKey(A.keyBytes());
    expect(B.keyBytes()).toEqual(A.keyBytes());
    expect((await B.load(own.id))!.notes).toEqual({ 'plan.notes': 'à B' });
    const [p] = await A.pending();
    expect(await B.applyRemote({ ...p!, version: 1 }, false)).toBe('applied');
    expect((await B.load(b.id))!.identity.nom).toBe('Dupont');
    expect((await B.list()).length).toBe(2);
  }, 30000);

  it('pending, markSynced, tombe', async () => {
    const v = await createVault('123456', { idb: new IDBFactory() });
    const b = sample();
    await v.save(b);
    const [p] = await v.pending();
    expect(p).toMatchObject({ id: b.id, version: 0, deleted: false });
    await v.markSynced(b.id, 3, p!.data.ct);
    expect(await v.pending()).toEqual([]);
    await v.save({ ...b, notes: { 'a.notes': 'modifié' } });
    expect((await v.pending())[0]).toMatchObject({ id: b.id, version: 3 });
    // markSynced avec un contenu qui a changé entre-temps : reste à envoyer, avec la nouvelle version
    const stale = (await v.pending())[0]!.data.ct;
    await v.save({ ...b, notes: { 'a.notes': 'encore' } });
    await v.markSynced(b.id, 4, stale);
    expect((await v.pending())[0]).toMatchObject({ id: b.id, version: 4 });
    await v.remove(b.id);
    expect(await v.load(b.id)).toBeNull();
    expect(await v.list()).toEqual([]);
    expect((await v.pending())[0]).toMatchObject({ id: b.id, deleted: true });
  }, 20000);

  it('bilan ouvert : une version distante devient une copie en conflit', async () => {
    const idbA = new IDBFactory();
    const A = await createVault('123456', { idb: idbA });
    const B = await createVault('123456', { idb: new IDBFactory() });
    await B.adoptKey(A.keyBytes());
    const b = sample();
    await A.save(b);
    const [pa] = await A.pending();
    await B.applyRemote({ ...pa!, version: 1 }, false);
    await A.save({ ...b, notes: { 'anamnese.notes': 'version de A' } });
    const [pa2] = await A.pending();
    await B.save({ ...b, notes: { 'anamnese.notes': 'version de B' } });
    expect(await B.applyRemote({ ...pa2!, version: 2 }, true)).toBe('copied');
    expect((await B.load(b.id))!.notes['anamnese.notes']).toBe('version de B');
    const list = await B.list();
    expect(list).toHaveLength(2);
    const copy = list.find((m) => m.conflictOf === b.id)!;
    expect(copy.conflictAt).toBeTruthy();
    const copied = (await B.load(copy.id))!;
    expect(copied.id).toBe(copy.id);
    expect(copied.notes['anamnese.notes']).toBe('version de A');
    // le bilan ouvert reprend la version distante comme base, pour l'écraser au prochain envoi
    expect((await B.pending()).find((p) => p.id === b.id)).toMatchObject({ version: 2 });
  }, 30000);

  it('bilan modifié non ouvert : la version distante attend l’envoi', async () => {
    const A = await createVault('123456', { idb: new IDBFactory() });
    const b = sample();
    await A.save(b);
    const [p] = await A.pending();
    expect(await A.applyRemote({ ...p!, version: 5 }, false)).toBe('skipped');
    const copyId = await A.keepAsConflictCopy(b.id, '2026-11-25T14:03:00.000Z');
    expect(copyId).not.toBe(b.id);
    expect((await A.list()).find((m) => m.id === copyId)).toMatchObject({ conflictOf: b.id });
  }, 20000);

  it('configuration de synchronisation chiffrée', async () => {
    const idb = new IDBFactory();
    const v = await createVault('123456', { idb });
    expect(await v.getSyncConfig()).toBeNull();
    await v.setSyncConfig({ token: 'jeton-tres-secret' });
    expect(await v.getSyncConfig()).toEqual({ token: 'jeton-tres-secret' });
    const again = await unlockVault('123456', { idb });
    expect(await again.getSyncConfig()).toEqual({ token: 'jeton-tres-secret' });
    globalThis.indexedDB = idb;
    expect(await rawDump()).not.toContain('jeton-tres-secret');
  }, 20000);
});
