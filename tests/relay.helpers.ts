// Outils de test du relais : appel direct de handle() comme si c'était le réseau.
import { handle } from '../relay/src/handler';
import type { RelayStore } from '../relay/src/store';

export const ENV = {
  RELAY_SETUP_CODE: 'phrase secrète de Yass',
  ALLOWED_ORIGIN: 'https://yassinben996-art.github.io',
};
export const BASE = 'https://relais.test';

/** Un fetch qui appelle handle() sur ce stockage (horloge injectable). */
export function fetchFor(store: RelayStore, now: () => Date = () => new Date()): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(String(input), init);
    return handle(req, ENV, store, now);
  }) as typeof fetch;
}

export async function call(
  f: typeof fetch,
  method: string,
  path: string,
  body?: unknown,
  token?: string,
  headers: Record<string, string> = {},
) {
  const res = await f(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
  };
}

const box = { iv: 'aXY=', ct: 'Y3Q=' };
export const rec = (baseVersion: number, deleted = false) => ({ baseVersion, meta: box, data: box, deleted });

/** Comportement attendu de tout stockage du relais (mémoire, D1). */
export function storeContract(make: () => RelayStore | Promise<RelayStore>) {
  it('contrat : compte unique', async () => {
    const s = await make();
    expect(await s.hasAccount()).toBe(false);
    const d = { id: 'd1', name: 'Tablette', tokenHash: 'h1', createdAt: 'x', lastSeen: 'x', revoked: false };
    await s.createAccount(d);
    expect(await s.hasAccount()).toBe(true);
    await expect(s.createAccount({ ...d, id: 'd2', tokenHash: 'h2' })).rejects.toThrow();
    expect((await s.deviceByTokenHash('h1'))?.id).toBe('d1');
  });
  it('contrat : appareils et tickets', async () => {
    const s = await make();
    await s.createAccount({
      id: 'd1',
      name: 'A',
      tokenHash: 'h1',
      createdAt: 'x',
      lastSeen: 'x',
      revoked: false,
    });
    await s.addDevice({
      id: 'd2',
      name: 'B',
      tokenHash: 'h2',
      createdAt: 'x',
      lastSeen: 'x',
      revoked: false,
    });
    expect((await s.listDevices()).map((d) => d.id).sort()).toEqual(['d1', 'd2']);
    await s.revokeDevice('d2');
    expect((await s.deviceByTokenHash('h2'))?.revoked).toBe(true);
    await s.touchDevice('d1', '2026-11-25T10:00:00.000Z');
    expect((await s.deviceByTokenHash('h1'))?.lastSeen).toBe('2026-11-25T10:00:00.000Z');
    await s.addTicket('t1', '2026-11-25T10:10:00.000Z');
    expect(await s.useTicket('t1', '2026-11-25T10:05:00.000Z')).toBe(true);
    expect(await s.useTicket('t1', '2026-11-25T10:05:00.000Z')).toBe(false);
    await s.addTicket('t2', '2026-11-25T10:10:00.000Z');
    expect(await s.useTicket('t2', '2026-11-25T10:11:00.000Z')).toBe(false);
    expect(await s.useTicket('inconnu', '2026-11-25T10:00:00.000Z')).toBe(false);
  });
  it('contrat : enregistrements et séquence', async () => {
    const s = await make();
    const a = (await s.putRecord({ id: 'a', meta: 'm', data: 'd', version: 1, deleted: false }))!;
    const b = (await s.putRecord({ id: 'b', meta: 'm', data: 'd', version: 1, deleted: false }))!;
    const a2 = (await s.putRecord({ id: 'a', meta: 'm2', data: 'd2', version: 2, deleted: false }))!;
    expect(b).toBeGreaterThan(a);
    expect(a2).toBeGreaterThan(b);
    // version qui ne suit pas la courante → conflit, rien n'est écrit
    expect(await s.putRecord({ id: 'a', meta: 'x', data: 'x', version: 2, deleted: false })).toBeNull();
    expect(await s.putRecord({ id: 'c', meta: 'x', data: 'x', version: 3, deleted: false })).toBeNull();
    expect(await s.getRecord('a')).toMatchObject({
      id: 'a',
      meta: 'm2',
      version: 2,
      seq: a2,
      deleted: false,
    });
    expect((await s.recordsSince(0, 10)).map((r) => r.id)).toEqual(['b', 'a']);
    expect((await s.recordsSince(a2, 10)).map((r) => r.id)).toEqual([]);
    expect(await s.getRecord('zz')).toBeNull();
  });
  it('contrat : compteur horaire de l’IA', async () => {
    const s = await make();
    for (let i = 0; i < 30; i++) expect(await s.aiCountUp('2026-11-26T10', 30)).toBe(true);
    expect(await s.aiCountUp('2026-11-26T10', 30)).toBe(false);
    expect(await s.aiCountUp('2026-11-26T11', 30)).toBe(true);
  });
  it('contrat : boîte aux lettres des questionnaires à domicile', async () => {
    const s = await make();
    const t0 = '2026-11-27T10:00:00.000Z';
    await s.addHomeTicket('h', '2026-12-11T10:00:00.000Z', t0);
    expect(await s.submitHome('h', 'b', '2026-11-28T10:00:00.000Z')).toBe(true);
    expect(await s.submitHome('h', 'b2', '2026-11-28T10:00:00.000Z')).toBe(false);
    expect(await s.submitHome('x', 'b', '2026-11-28T10:00:00.000Z')).toBe(false);
    await s.addHomeTicket('vieux', '2026-11-28T00:00:00.000Z', t0);
    expect(await s.submitHome('vieux', 'b', '2026-11-28T00:00:00.000Z')).toBe(false); // expiré
    const now = '2026-11-28T12:00:00.000Z';
    const lease = '2026-11-28T11:50:00.000Z';
    expect(await s.homeInbox(lease)).toEqual(['h']);
    expect(await s.claimHome('h', 'd1', now, lease)).toBe('b');
    expect(await s.homeInbox(lease)).toEqual([]);
    expect(await s.claimHome('h', 'd2', now, lease)).toBeNull(); // bail en cours
    const later = '2026-11-28T12:10:01.000Z';
    expect(await s.homeInbox('2026-11-28T12:00:01.000Z')).toEqual(['h']);
    expect(await s.claimHome('h', 'd2', later, '2026-11-28T12:00:01.000Z')).toBe('b'); // bail expiré
    await s.deleteHome('h');
    expect(await s.homeInbox(later)).toEqual([]);
    expect(await s.claimHome('h', 'd2', later, later)).toBeNull();
  });
  it('contrat : purge des tickets expirés', async () => {
    const s = await make();
    await s.addHomeTicket('vide', '2026-11-28T00:00:00.000Z', '2026-11-27T00:00:00.000Z');
    await s.addHomeTicket('plein', '2026-11-28T00:00:00.000Z', '2026-11-27T00:00:00.000Z');
    expect(await s.submitHome('plein', 'b', '2026-11-27T12:00:00.000Z')).toBe(true);
    // Le lendemain de l'expiration : le ticket vide disparaît, le dépôt reste (30 jours).
    await s.addHomeTicket('autre', '2026-12-20T00:00:00.000Z', '2026-11-29T00:00:00.000Z');
    expect(await s.submitHome('vide', 'b', '2026-11-27T13:00:00.000Z')).toBe(false);
    expect(await s.homeInbox('2026-11-29T00:00:00.000Z')).toEqual(['plein']);
    // Plus de 30 jours après l'expiration : le dépôt est effacé.
    await s.addHomeTicket('encore', '2027-01-20T00:00:00.000Z', '2026-12-29T00:00:01.000Z');
    expect(await s.homeInbox('2026-12-29T00:00:01.000Z')).toEqual([]);
  });
}
