// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../relay/src/memoryStore';
import { call, ENV, fetchFor, rec, storeContract } from './relay.helpers';

async function setup() {
  const store = new MemoryStore();
  let t = new Date('2026-11-25T10:00:00.000Z').getTime();
  const clock = { advance: (ms: number) => (t += ms) };
  const f = fetchFor(store, () => new Date(t));
  const r = await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'Tablette' });
  return { store, f, clock, token: r.json.token as string, deviceId: r.json.deviceId as string };
}

describe('relais', () => {
  storeContract(() => new MemoryStore());

  it('setup : code faux → 403, bon → 201, second → 403', async () => {
    const f = fetchFor(new MemoryStore());
    expect((await call(f, 'POST', '/setup', { setupCode: 'non', deviceName: 'X' })).status).toBe(403);
    const ok = await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'X' });
    expect(ok.status).toBe(201);
    expect(typeof ok.json.token).toBe('string');
    expect((ok.json.token as string).length).toBeGreaterThanOrEqual(43);
    expect(
      (await call(f, 'POST', '/setup', { setupCode: ENV.RELAY_SETUP_CODE, deviceName: 'Y' })).status,
    ).toBe(403);
  });

  it('auth : sans jeton ou jeton faux → 401', async () => {
    const { f } = await setup();
    expect((await call(f, 'GET', '/records?since=0')).status).toBe(401);
    expect((await call(f, 'GET', '/records?since=0', undefined, 'faux')).status).toBe(401);
    expect((await call(f, 'GET', '/devices', undefined, 'faux')).status).toBe(401);
    expect((await call(f, 'POST', '/pair/ticket', {}, 'faux')).status).toBe(401);
  });

  it('enregistrements : versions et conflits', async () => {
    const { f, token } = await setup();
    const a = await call(f, 'PUT', '/records/a1', rec(0), token);
    expect(a.status).toBe(200);
    expect(a.json.version).toBe(1);
    const c = await call(f, 'PUT', '/records/a1', rec(0), token);
    expect(c.status).toBe(409);
    expect((c.json.current as { version: number }).version).toBe(1);
    expect((await call(f, 'PUT', '/records/a1', rec(1), token)).json.version).toBe(2);
    await call(f, 'PUT', '/records/b2', rec(0, true), token);
    const all = await call(f, 'GET', '/records?since=0', undefined, token);
    const records = all.json.records as { id: string; seq: number; deleted: boolean; meta: unknown }[];
    expect(records.map((r) => r.id)).toEqual(['a1', 'b2']);
    expect(records[0]!.meta).toEqual({ iv: 'aXY=', ct: 'Y3Q=' });
    expect(records[1]!.deleted).toBe(true);
    expect(all.json.cursor).toBe(records[1]!.seq);
    expect(
      (await call(f, 'GET', `/records?since=${all.json.cursor}`, undefined, token)).json.records,
    ).toEqual([]);
  });

  it('id d’enregistrement invalide → 400', async () => {
    const { f, token } = await setup();
    expect((await call(f, 'PUT', '/records/a%2F..%2Fx', rec(0), token)).status).toBe(400);
    expect((await call(f, 'PUT', `/records/${'x'.repeat(65)}`, rec(0), token)).status).toBe(400);
  });

  it('tickets : une seule fois, 10 minutes', async () => {
    const { f, token, clock } = await setup();
    const t = await call(f, 'POST', '/pair/ticket', {}, token);
    expect(t.status).toBe(201);
    const r = await call(f, 'POST', '/pair/redeem', { ticket: t.json.ticket, deviceName: 'Téléphone' });
    expect(r.status).toBe(201);
    expect((await call(f, 'GET', '/records?since=0', undefined, r.json.token as string)).status).toBe(200);
    expect((await call(f, 'POST', '/pair/redeem', { ticket: t.json.ticket, deviceName: 'X' })).status).toBe(
      410,
    );
    const t2 = await call(f, 'POST', '/pair/ticket', {}, token);
    clock.advance(11 * 60 * 1000);
    expect((await call(f, 'POST', '/pair/redeem', { ticket: t2.json.ticket, deviceName: 'X' })).status).toBe(
      410,
    );
    expect((await call(f, 'POST', '/pair/redeem', { ticket: 'inconnu', deviceName: 'X' })).status).toBe(410);
  });

  it('appareils : liste et retrait', async () => {
    const { f, token } = await setup();
    const t = await call(f, 'POST', '/pair/ticket', {}, token);
    const b = await call(f, 'POST', '/pair/redeem', { ticket: t.json.ticket, deviceName: 'Téléphone' });
    const list = (await call(f, 'GET', '/devices', undefined, token)).json.devices as {
      id: string;
      current: boolean;
    }[];
    expect(list).toHaveLength(2);
    expect(list.find((d) => d.current)?.id).not.toBe(b.json.deviceId);
    expect((await call(f, 'DELETE', `/devices/${b.json.deviceId}`, undefined, token)).status).toBe(204);
    expect((await call(f, 'GET', '/records?since=0', undefined, b.json.token as string)).status).toBe(401);
    expect(((await call(f, 'GET', '/devices', undefined, token)).json.devices as unknown[]).length).toBe(1);
  });

  it('CORS', async () => {
    const { f } = await setup();
    const ok = await call(f, 'OPTIONS', '/records', undefined, undefined, { origin: ENV.ALLOWED_ORIGIN });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(ENV.ALLOWED_ORIGIN);
    const local = await call(f, 'OPTIONS', '/records', undefined, undefined, {
      origin: 'http://localhost:5173',
    });
    expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const bad = await call(f, 'OPTIONS', '/records', undefined, undefined, {
      origin: 'https://evil.example',
    });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('corps trop gros → 413, trop de requêtes → 429', async () => {
    const { f, token } = await setup();
    const big = JSON.stringify({ ...rec(0), meta: { iv: 'a', ct: 'x'.repeat(2.5 * 1024 * 1024) } });
    expect((await call(f, 'PUT', '/records/big', big, token)).status).toBe(413);
    let last = 0;
    for (let i = 0; i < 125; i++) last = (await call(f, 'GET', '/records?since=0', undefined, token)).status;
    expect(last).toBe(429);
  });
});
