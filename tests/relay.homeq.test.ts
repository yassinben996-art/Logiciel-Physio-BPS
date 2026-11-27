// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import { call, ENV, fetchFor } from './relay.helpers';

const T0 = new Date('2026-11-27T10:00:00.000Z');
const box = { iv: 'aXY=', ct: 'Y3Q=' };

async function setup() {
  const store = new MemoryStore();
  let now = T0;
  const f = fetchFor(store, () => now);
  const a = await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'A' });
  const tokA = a.json.token as string;
  const tk = await call(f, 'POST', '/pair/ticket', {}, tokA);
  const b = await call(f, 'POST', '/pair/redeem', { ticket: tk.json.ticket, deviceName: 'B' });
  return { f, tokA, tokB: b.json.token as string, setNow: (d: Date) => (now = d) };
}

describe('relais : questionnaires à domicile', () => {
  it('ticket valable 14 jours, un seul dépôt, sans jeton', async () => {
    const { f, tokA } = await setup();
    expect((await call(f, 'POST', '/q/ticket', {})).status).toBe(401);
    const t = await call(f, 'POST', '/q/ticket', {}, tokA);
    expect(t.status).toBe(201);
    expect(t.json.expiresAt).toBe('2026-12-11T10:00:00.000Z');
    const ticket = t.json.ticket as string;
    expect(ticket).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect((await call(f, 'POST', '/q/submit', { ticket, box })).status).toBe(201);
    expect((await call(f, 'POST', '/q/submit', { ticket, box })).status).toBe(410);
    expect((await call(f, 'POST', '/q/submit', { ticket: 'inconnu', box })).status).toBe(410);
  });
  it('expiré, trop gros, invalide', async () => {
    const { f, tokA, setNow } = await setup();
    const ticket = (await call(f, 'POST', '/q/ticket', {}, tokA)).json.ticket as string;
    expect((await call(f, 'POST', '/q/submit', { ticket })).status).toBe(400);
    expect(
      (await call(f, 'POST', '/q/submit', { ticket, box: { iv: 'a', ct: 'x'.repeat(65 * 1024) } })).status,
    ).toBe(413);
    setNow(new Date(T0.getTime() + 14 * 86400000 + 1));
    expect((await call(f, 'POST', '/q/submit', { ticket, box })).status).toBe(410);
  });
  it('relève par un seul appareil, bail de 10 minutes, suppression', async () => {
    const { f, tokA, tokB, setNow } = await setup();
    const ticket = (await call(f, 'POST', '/q/ticket', {}, tokA)).json.ticket as string;
    await call(f, 'POST', '/q/submit', { ticket, box });
    expect((await call(f, 'GET', '/q/inbox')).status).toBe(401);
    const inbox = await call(f, 'GET', '/q/inbox', undefined, tokA);
    const hashes = inbox.json.hashes as string[];
    expect(hashes).toHaveLength(1);
    const h = hashes[0]!;
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    const c1 = await call(f, 'POST', `/q/claim/${h}`, {}, tokA);
    expect(c1.status).toBe(200);
    expect(c1.json.box).toEqual(box);
    expect((await call(f, 'POST', `/q/claim/${h}`, {}, tokB)).status).toBe(409);
    expect((await call(f, 'GET', '/q/inbox', undefined, tokB)).json.hashes).toEqual([]);
    setNow(new Date(T0.getTime() + 10 * 60000 + 1));
    expect((await call(f, 'POST', `/q/claim/${h}`, {}, tokB)).status).toBe(200);
    expect((await call(f, 'DELETE', `/q/${h}`, undefined, tokB)).status).toBe(204);
    expect((await call(f, 'GET', '/q/inbox', undefined, tokA)).json.hashes).toEqual([]);
  });
});
