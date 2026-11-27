// Client HTTP du relais. Il ne transporte que des boîtes chiffrées.
import type { Box } from '../storage/crypto';
import type { WireRecord } from '../storage/vault';

export interface SyncConfig {
  relayUrl: string;
  deviceId: string;
  deviceName: string;
  token: string;
  cursor: number;
}

export interface RemoteRecord extends WireRecord {
  seq: number;
}

export interface RemoteDevice {
  id: string;
  name: string;
  lastSeen: string;
  current: boolean;
}

export class RelayError extends Error {
  constructor(
    public status: number,
    msg: string,
  ) {
    super(msg);
  }
}

export function relayApi(relayUrl: string, token: string | null, f: typeof fetch = fetch) {
  const base = relayUrl.replace(/\/+$/, '');
  async function call<T>(
    method: string,
    path: string,
    body?: unknown,
    ok: number[] = [200, 201, 204],
  ): Promise<{ status: number; json: T }> {
    const res = await f(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = (text ? JSON.parse(text) : {}) as T;
    if (!ok.includes(res.status)) throw new RelayError(res.status, `relais : ${res.status}`);
    return { status: res.status, json };
  }
  return {
    setup: async (setupCode: string, deviceName: string) =>
      (await call<{ deviceId: string; token: string }>('POST', '/setup', { setupCode, deviceName })).json,
    ticket: async () => (await call<{ ticket: string; expiresAt: string }>('POST', '/pair/ticket', {})).json,
    redeem: async (ticket: string, deviceName: string) =>
      (await call<{ deviceId: string; token: string }>('POST', '/pair/redeem', { ticket, deviceName })).json,
    devices: async () => (await call<{ devices: RemoteDevice[] }>('GET', '/devices')).json.devices,
    revoke: async (id: string) => {
      await call('DELETE', `/devices/${encodeURIComponent(id)}`);
    },
    ai: async (system: string, user: string) =>
      (await call<{ provider: string; model: string; text: string }>('POST', '/ai', { system, user })).json,
    homeSubmitRaw: async (ticket: string, box: Box) => {
      await call('POST', '/q/submit', { ticket, box });
    },
    homeTicket: async () => (await call<{ ticket: string; expiresAt: string }>('POST', '/q/ticket', {})).json,
    homeInbox: async () => (await call<{ hashes: string[] }>('GET', '/q/inbox')).json.hashes,
    /** Relève la boîte (bail de 10 minutes) ; null si un autre appareil l'a déjà relevée. */
    homeClaim: async (hash: string): Promise<Box | null> => {
      const r = await call<{ box?: Box }>('POST', `/q/claim/${hash}`, {}, [200, 409]);
      return r.status === 200 ? (r.json.box ?? null) : null;
    },
    /** Révoque l'ancien lien ; faux si le patient y a déjà répondu. */
    homeRevoke: async (hash: string): Promise<boolean> =>
      (await call('POST', `/q/revoke/${hash}`, {}, [204, 409])).status === 204,
    homeDone: async (hash: string) => {
      await call('DELETE', `/q/${hash}`);
    },
    since: async (cursor: number) =>
      (await call<{ records: RemoteRecord[]; cursor: number }>('GET', `/records?since=${cursor}`)).json,
    put: async (
      id: string,
      baseVersion: number,
      meta: Box,
      data: Box,
      deleted: boolean,
    ): Promise<{ version: number } | { conflict: RemoteRecord | null }> => {
      const r = await call<{ version: number; current?: RemoteRecord | null }>(
        'PUT',
        `/records/${encodeURIComponent(id)}`,
        { baseVersion, meta, data, deleted },
        [200, 409],
      );
      return r.status === 409 ? { conflict: r.json.current ?? null } : { version: r.json.version };
    },
  };
}

export type RelayApi = ReturnType<typeof relayApi>;

/** Dépôt des réponses du patient (route publique : le ticket suffit). Lève RelayError (410 : lien expiré ou utilisé). */
export async function homeSubmit(
  relayUrl: string,
  ticket: string,
  box: Box,
  f: typeof fetch = fetch,
): Promise<void> {
  await relayApi(relayUrl, null, f).homeSubmitRaw(ticket, box);
}
