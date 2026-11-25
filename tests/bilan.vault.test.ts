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
