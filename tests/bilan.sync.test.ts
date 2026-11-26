// @vitest-environment node
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import { emptyBilan, type BilanState } from '../src/bilan/state/bilan';
import { createVault, type Vault } from '../src/bilan/storage/vault';
import { activateSync, createPairingCode, linkDevice, SYNC_LABEL, syncOnce } from '../src/bilan/sync/engine';
import { BASE, ENV, fetchFor } from './relay.helpers';

const no = () => false;
const bilan = (note: string): BilanState => ({ ...emptyBilan('shoulder'), notes: { 'anamnese.notes': note } });

async function twoDevices() {
  const store = new MemoryStore();
  const f = fetchFor(store);
  const A = await createVault('123456', { idb: new IDBFactory() });
  const B = await createVault('654321', { idb: new IDBFactory() });
  await activateSync(A, BASE, ENV.RELAY_SETUP_CODE, 'Tablette', f);
  return { store, f, A, B };
}
async function link(A: Vault, B: Vault, f: typeof fetch) {
  const { code } = await createPairingCode(A, f);
  await linkDevice(B, BASE, code, 'Téléphone', f);
}
const notesOf = async (v: Vault) =>
  (await Promise.all((await v.list()).map(async (m) => (await v.load(m.id))!.notes['anamnese.notes']))).sort();

describe('synchronisation', () => {
  it('libellés exacts', () =>
    expect(SYNC_LABEL).toEqual({
      synced: 'Synchronisé',
      syncing: 'Synchronisation…',
      offline: 'Hors connexion : les modifications partiront au retour du réseau',
      error: 'Erreur de synchronisation',
    }));

  it('activation : mauvais code refusé, bon code enregistré', async () => {
    const f = fetchFor(new MemoryStore());
    const A = await createVault('123456', { idb: new IDBFactory() });
    await expect(activateSync(A, BASE, 'faux', 'Tablette', f)).rejects.toThrow('Code d’installation incorrect');
    expect(await A.getSyncConfig()).toBeNull();
    await activateSync(A, BASE, ENV.RELAY_SETUP_CODE, 'Tablette', f);
    expect(await A.getSyncConfig()).toMatchObject({ relayUrl: BASE, deviceName: 'Tablette', cursor: 0 });
  }, 30000);

  it('relier un appareil qui a déjà ses bilans : union des deux côtés', async () => {
    const { f, A, B } = await twoDevices();
    await A.save(bilan('de A'));
    expect((await syncOnce(A, { isOpen: no, f })).status).toBe('synced');
    await B.save(bilan('de B'));
    await link(A, B, f);
    expect((await syncOnce(B, { isOpen: no, f })).status).toBe('synced');
    await syncOnce(A, { isOpen: no, f });
    expect(await notesOf(A)).toEqual(['de A', 'de B']);
    expect(await notesOf(B)).toEqual(['de A', 'de B']);
  }, 30000);

  it('un code ne sert qu’une fois ; un code mal tapé est refusé', async () => {
    const { f, A, B } = await twoDevices();
    const { code } = await createPairingCode(A, f);
    await linkDevice(B, BASE, code, 'Téléphone', f);
    const C = await createVault('111111', { idb: new IDBFactory() });
    await expect(linkDevice(C, BASE, code, 'Ordi', f)).rejects.toThrow('Code expiré ou déjà utilisé');
    await expect(linkDevice(C, BASE, code.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')), 'Ordi', f)).rejects.toThrow(
      'Code incorrect : vérifie la saisie',
    );
    expect(await C.getSyncConfig()).toBeNull();
  }, 30000);

  it('modification et suppression se propagent', async () => {
    const { f, A, B } = await twoDevices();
    await link(A, B, f);
    const b = bilan('v1');
    await A.save(b);
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    expect(await notesOf(B)).toEqual(['v1']);
    await A.save({ ...b, notes: { 'anamnese.notes': 'v2' } });
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    expect(await notesOf(B)).toEqual(['v2']);
    await A.remove(b.id);
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    expect(await B.list()).toEqual([]);
  }, 30000);

  it('conflit hors écran : la version arrivée la première reste, l’autre devient une copie', async () => {
    const { f, A, B } = await twoDevices();
    await link(A, B, f);
    const b = bilan('base');
    await A.save(b);
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    await A.save({ ...b, notes: { 'anamnese.notes': 'de A' } });
    await B.save({ ...b, notes: { 'anamnese.notes': 'de B' } });
    await syncOnce(A, { isOpen: no, f });
    const r = await syncOnce(B, { isOpen: no, f });
    expect(r.copied).toBe(1);
    expect((await B.load(b.id))!.notes['anamnese.notes']).toBe('de A');
    const copy = (await B.list()).find((m) => m.conflictOf === b.id)!;
    expect((await B.load(copy.id))!.notes['anamnese.notes']).toBe('de B');
    await syncOnce(A, { isOpen: no, f });
    expect(await notesOf(A)).toEqual(['de A', 'de B']);
  }, 30000);

  it('conflit sur le bilan ouvert : la saisie à l’écran reste, l’autre devient une copie', async () => {
    const { f, A, B } = await twoDevices();
    await link(A, B, f);
    const b = bilan('base');
    await A.save(b);
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    await A.save({ ...b, notes: { 'anamnese.notes': 'de A' } });
    await B.save({ ...b, notes: { 'anamnese.notes': 'de B, à l’écran' } });
    await syncOnce(A, { isOpen: no, f });
    const r = await syncOnce(B, { isOpen: (id) => id === b.id, f });
    expect(r.openCopied).toBe(true);
    expect((await B.load(b.id))!.notes['anamnese.notes']).toBe('de B, à l’écran');
    await syncOnce(A, { isOpen: no, f });
    expect((await A.load(b.id))!.notes['anamnese.notes']).toBe('de B, à l’écran');
    expect(await notesOf(A)).toEqual(['de A', 'de B, à l’écran']);
  }, 30000);

  it('réseau coupé puis rétabli ; erreur 500', async () => {
    const { f, A } = await twoDevices();
    await A.save(bilan('hors ligne'));
    const down = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    expect((await syncOnce(A, { isOpen: no, f: down })).status).toBe('offline');
    expect(await A.pending()).toHaveLength(1);
    const err500 = (async () => new Response('{}', { status: 500 })) as typeof fetch;
    expect((await syncOnce(A, { isOpen: no, f: err500 })).status).toBe('offline');
    expect((await syncOnce(A, { isOpen: no, f })).status).toBe('synced');
    expect(await A.pending()).toEqual([]);
  }, 30000);

  it('appareil retiré → erreur ; sans configuration → off', async () => {
    const { f, A, B } = await twoDevices();
    await link(A, B, f);
    const { relayApi } = await import('../src/bilan/sync/api');
    const cfgA = (await A.getSyncConfig<{ token: string }>())!;
    const cfgB = (await B.getSyncConfig<{ deviceId: string }>())!;
    await relayApi(BASE, cfgA.token, f).revoke(cfgB.deviceId);
    expect((await syncOnce(B, { isOpen: no, f })).status).toBe('error');
    const C = await createVault('111111', { idb: new IDBFactory() });
    expect((await syncOnce(C, { isOpen: no, f })).status).toBe('off');
  }, 30000);
});
