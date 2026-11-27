// @vitest-environment node
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import { newHomeKey, sealAnswers, ticketHash } from '../src/bilan/homeq/link';
import { bilanReducer, emptyBilan, type BilanAction } from '../src/bilan/state/bilan';
import { createVault, type Vault } from '../src/bilan/storage/vault';
import { homeSubmit, relayApi, type SyncConfig } from '../src/bilan/sync/api';
import { activateSync, createPairingCode, linkDevice, syncOnce } from '../src/bilan/sync/engine';
import { BASE, ENV, fetchFor } from './relay.helpers';

const no = () => false;

async function device() {
  const store = new MemoryStore();
  const f = fetchFor(store);
  const A = await createVault('123456', { idb: new IDBFactory() });
  await activateSync(A, BASE, ENV.RELAY_SETUP_CODE, 'Tablette', f);
  return { store, f, A };
}

/** Bilan avec une demande en attente ; renvoie le lien (ticket, clé). */
async function withRequest(v: Vault, f: typeof fetch, key = newHomeKey()) {
  const cfg = (await v.getSyncConfig<SyncConfig>())!;
  const t = await relayApi(cfg.relayUrl, cfg.token, f).homeTicket();
  const b = bilanReducer(emptyBilan('shoulder'), {
    type: 'homeQCreate',
    req: {
      ticket: t.ticket,
      hash: await ticketHash(t.ticket),
      key,
      ids: ['tsk'],
      createdAt: '2026-11-27T10:00:00.000Z',
      expiresAt: t.expiresAt,
    },
  });
  await v.save(b);
  return { id: b.id, ticket: t.ticket, key };
}
const inbox = async (v: Vault, f: typeof fetch) => {
  const cfg = (await v.getSyncConfig<SyncConfig>())!;
  return relayApi(cfg.relayUrl, cfg.token, f).homeInbox();
};

describe('relève des questionnaires à domicile', () => {
  it('bilan fermé : réponses intégrées, dépôt supprimé', async () => {
    const { f, A } = await device();
    const r = await withRequest(A, f);
    await homeSubmit(BASE, r.ticket, await sealAnswers(r.key, { tsk: { tsk1: 3 }, intrus: { x: 1 } }), f);
    const res = await syncOnce(A, { isOpen: no, f });
    expect(res.status).toBe('synced');
    expect(res.homeReceived).toBe(1);
    const b = (await A.load(r.id))!;
    expect(b.homeQ).toBeNull();
    expect(Object.keys(b.qResults)).toEqual(['tsk']); // seulement les questionnaires demandés
    expect(b.qResults.tsk!.answers).toEqual({ tsk1: 3 });
    expect(await inbox(A, f)).toEqual([]);
    expect((await A.pending()).length).toBe(0); // la modification est déjà partie
  }, 30000);

  it('bilan ouvert : passe par applyOpen ; refus → dépôt gardé', async () => {
    const { f, A } = await device();
    const r = await withRequest(A, f);
    await homeSubmit(BASE, r.ticket, await sealAnswers(r.key, { tsk: { tsk1: 1 } }), f);
    const refuse = vi.fn<(id: string, a: BilanAction) => Promise<boolean>>(async () => false);
    await syncOnce(A, { isOpen: (id) => id === r.id, f, applyOpen: refuse });
    expect(refuse).toHaveBeenCalledOnce();
    expect(refuse.mock.calls[0]![1]).toMatchObject({ type: 'homeQReceived', answers: { tsk: { tsk1: 1 } } });
    expect((await A.load(r.id))!.homeQ).not.toBeNull();
    expect(await inbox(A, f)).toHaveLength(0); // relevé (bail en cours), mais pas supprimé
    const accept = vi.fn(async () => true);
    // Bail toujours en cours : rien à relever tout de suite.
    await syncOnce(A, { isOpen: (id) => id === r.id, f, applyOpen: accept });
    expect(accept).not.toHaveBeenCalled();
  }, 30000);

  it('deux appareils en même temps : un seul intègre, aucune copie en conflit', async () => {
    const { f, A } = await device();
    const B = await createVault('654321', { idb: new IDBFactory() });
    const r = await withRequest(A, f);
    await syncOnce(A, { isOpen: no, f });
    const { code } = await createPairingCode(A, f);
    await linkDevice(B, BASE, code, 'Téléphone', f);
    await syncOnce(B, { isOpen: no, f });
    await homeSubmit(BASE, r.ticket, await sealAnswers(r.key, { tsk: { tsk1: 2 } }), f);
    const [ra, rb] = await Promise.all([syncOnce(A, { isOpen: no, f }), syncOnce(B, { isOpen: no, f })]);
    expect(ra.homeReceived + rb.homeReceived).toBe(1);
    await syncOnce(A, { isOpen: no, f });
    await syncOnce(B, { isOpen: no, f });
    for (const v of [A, B]) {
      const list = await v.list();
      expect(list).toHaveLength(1);
      expect(list[0]!.conflictOf).toBeUndefined();
      expect((await v.load(r.id))!.qResults.tsk!.answers).toEqual({ tsk1: 2 });
    }
  }, 30000);

  it('mauvaise clé : dépôt laissé, bilan inchangé', async () => {
    const { f, A } = await device();
    const r = await withRequest(A, f);
    await homeSubmit(BASE, r.ticket, await sealAnswers(newHomeKey(), { tsk: { tsk1: 2 } }), f);
    const res = await syncOnce(A, { isOpen: no, f });
    expect(res.homeReceived).toBe(0);
    expect((await A.load(r.id))!.homeQ).not.toBeNull();
  }, 30000);
});
