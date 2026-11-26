// Logique du relais (Cloudflare Worker), indépendante du stockage. Le relais ne voit que des boîtes
// chiffrées : la clé de coffre ne quitte jamais les appareils de Yass.
import type { DeviceRow, RecordRow, RelayStore } from './store';

export interface RelayEnv {
  RELAY_SETUP_CODE: string;
  ALLOWED_ORIGIN: string;
}

const MAX_BODY = 2 * 1024 * 1024;
const RATE_LIMIT = 120; // requêtes par minute et par appareil
const TICKET_MS = 10 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const LOCAL_ORIGIN = 'http://localhost:5173';

/** Compteurs de l'isolat (meilleur effort : réinitialisés quand Cloudflare recycle l'isolat). */
const rate = new Map<string, { minute: number; count: number }>();

const enc = new TextEncoder();
const b64url = (b: Uint8Array) => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const random = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));
async function sha256(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('');
}
/** Comparaison à temps constant. */
function sameText(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

class HttpError extends Error {
  constructor(
    public status: number,
    msg: string,
  ) {
    super(msg);
  }
}

function cors(req: Request, env: RelayEnv): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || (origin !== env.ALLOWED_ORIGIN && origin !== LOCAL_ORIGIN)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > MAX_BODY) throw new HttpError(413, 'trop gros');
  const text = await req.text();
  if (enc.encode(text).length > MAX_BODY) throw new HttpError(413, 'trop gros');
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* corps invalide */
  }
  throw new HttpError(400, 'JSON invalide');
}

const isBox = (b: unknown): b is { iv: string; ct: string } =>
  !!b &&
  typeof b === 'object' &&
  typeof (b as { iv?: unknown }).iv === 'string' &&
  typeof (b as { ct?: unknown }).ct === 'string';

const toWire = (r: RecordRow) => ({
  id: r.id,
  meta: JSON.parse(r.meta) as unknown,
  data: JSON.parse(r.data) as unknown,
  version: r.version,
  seq: r.seq,
  deleted: r.deleted,
});

async function newDevice(name: unknown, now: string): Promise<{ row: DeviceRow; token: string }> {
  const token = random(32);
  const label = typeof name === 'string' && name.trim() ? name.trim().slice(0, 60) : 'Appareil';
  return {
    token,
    row: {
      id: crypto.randomUUID(),
      name: label,
      tokenHash: await sha256(token),
      createdAt: now,
      lastSeen: now,
      revoked: false,
    },
  };
}

export async function handle(
  req: Request,
  env: RelayEnv,
  store: RelayStore,
  now: () => Date = () => new Date(),
): Promise<Response> {
  const headers = cors(req, env);
  const reply = (status: number, body?: unknown) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { ...headers, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    });
  if (req.method === 'OPTIONS') return reply(204);

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const at = now();
    const iso = at.toISOString();

    // Routes publiques : création du compte (une seule fois) et utilisation d'un ticket d'appairage.
    if (req.method === 'POST' && path === '/setup') {
      const b = await readJson(req);
      const code = typeof b.setupCode === 'string' ? b.setupCode : '';
      if (!env.RELAY_SETUP_CODE || !sameText(code, env.RELAY_SETUP_CODE) || (await store.hasAccount()))
        return reply(403, { error: 'refusé' });
      const d = await newDevice(b.deviceName, iso);
      await store.createAccount(d.row);
      return reply(201, { deviceId: d.row.id, token: d.token });
    }
    if (req.method === 'POST' && path === '/pair/redeem') {
      const b = await readJson(req);
      const ticket = typeof b.ticket === 'string' ? b.ticket : '';
      if (!ticket || !(await store.useTicket(await sha256(ticket), iso)))
        return reply(410, { error: 'ticket expiré ou utilisé' });
      const d = await newDevice(b.deviceName, iso);
      await store.addDevice(d.row);
      return reply(201, { deviceId: d.row.id, token: d.token });
    }

    // Routes protégées.
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const device = token ? await store.deviceByTokenHash(await sha256(token)) : null;
    if (!device || device.revoked) return reply(401, { error: 'non autorisé' });
    const minute = Math.floor(at.getTime() / 60000);
    const r = rate.get(device.id);
    if (r && r.minute === minute) {
      if (++r.count > RATE_LIMIT) return reply(429, { error: 'trop de requêtes' });
    } else rate.set(device.id, { minute, count: 1 });
    await store.touchDevice(device.id, iso);

    if (req.method === 'POST' && path === '/pair/ticket') {
      const ticket = random(8);
      const expiresAt = new Date(at.getTime() + TICKET_MS).toISOString();
      await store.addTicket(await sha256(ticket), expiresAt);
      return reply(201, { ticket, expiresAt });
    }
    if (req.method === 'GET' && path === '/devices') {
      const devices = (await store.listDevices())
        .filter((d) => !d.revoked)
        .map((d) => ({
          id: d.id,
          name: d.name,
          lastSeen: d.id === device.id ? iso : d.lastSeen,
          current: d.id === device.id,
        }));
      return reply(200, { devices });
    }
    const dev = /^\/devices\/([^/]+)$/.exec(path);
    if (req.method === 'DELETE' && dev) {
      await store.revokeDevice(decodeURIComponent(dev[1]!));
      return reply(204);
    }
    if (req.method === 'GET' && path === '/records') {
      const since = Math.max(0, Number(url.searchParams.get('since') ?? '0') || 0);
      const rows = await store.recordsSince(since, 200);
      return reply(200, {
        records: rows.map(toWire),
        cursor: rows.length ? rows[rows.length - 1]!.seq : since,
      });
    }
    const m = /^\/records\/(.+)$/.exec(path);
    if (req.method === 'PUT' && m) {
      const id = decodeURIComponent(m[1]!);
      if (!ID_RE.test(id)) return reply(400, { error: 'identifiant invalide' });
      const b = await readJson(req);
      if (!isBox(b.meta) || !isBox(b.data) || typeof b.baseVersion !== 'number')
        return reply(400, { error: 'enregistrement invalide' });
      const current = await store.getRecord(id);
      const version = current?.version ?? 0;
      if (b.baseVersion !== version) return reply(409, { current: current ? toWire(current) : null });
      const seq = await store.putRecord({
        id,
        meta: JSON.stringify(b.meta),
        data: JSON.stringify(b.data),
        version: version + 1,
        deleted: b.deleted === true,
      });
      if (seq === null) {
        // Un autre appareil a écrit entre la lecture et l'écriture.
        const latest = await store.getRecord(id);
        return reply(409, { current: latest ? toWire(latest) : null });
      }
      return reply(200, { version: version + 1, seq });
    }
    return reply(404, { error: 'introuvable' });
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, { error: e.message });
    return reply(500, { error: 'erreur interne' });
  }
}
