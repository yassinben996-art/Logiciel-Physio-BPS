// Stockage D1 (SQLite de Cloudflare). Chaque écriture sensible est une seule requête atomique.
import type { DeviceRow, RecordRow, RelayStore } from './store';

/** Le sous-ensemble de l'API D1 utilisé ici (évite une dépendance aux types de Cloudflare). */
export interface D1Stmt {
  bind(...args: unknown[]): D1Stmt;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface D1Like {
  prepare(sql: string): D1Stmt;
  /** Exécute les requêtes comme une seule transaction (garantie de D1). */
  batch(stmts: D1Stmt[]): Promise<{ results?: unknown[]; meta: { changes: number } }[]>;
}

interface DeviceSql {
  id: string;
  name: string;
  token_hash: string;
  created_at: string;
  last_seen: string;
  revoked: number;
}
interface RecordSql {
  id: string;
  meta: string;
  data: string;
  version: number;
  seq: number;
  deleted: number;
}

const device = (r: DeviceSql): DeviceRow => ({
  id: r.id,
  name: r.name,
  tokenHash: r.token_hash,
  createdAt: r.created_at,
  lastSeen: r.last_seen,
  revoked: r.revoked === 1,
});
const record = (r: RecordSql): RecordRow => ({
  id: r.id,
  meta: r.meta,
  data: r.data,
  version: r.version,
  seq: r.seq,
  deleted: r.deleted === 1,
});

export class D1Store implements RelayStore {
  constructor(private db: D1Like) {}

  async hasAccount() {
    const r = await this.db
      .prepare("SELECT value FROM meta WHERE key = 'account'")
      .first<{ value: number }>();
    return r?.value === 1;
  }
  async createAccount(d: DeviceRow) {
    const r = await this.db.prepare("UPDATE meta SET value = 1 WHERE key = 'account' AND value = 0").run();
    if (r.meta.changes !== 1) throw new Error('compte existant');
    await this.addDevice(d);
  }
  async deviceByTokenHash(h: string) {
    const r = await this.db.prepare('SELECT * FROM devices WHERE token_hash = ?').bind(h).first<DeviceSql>();
    return r ? device(r) : null;
  }
  async addDevice(d: DeviceRow) {
    await this.db
      .prepare(
        'INSERT INTO devices (id, name, token_hash, created_at, last_seen, revoked) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(d.id, d.name, d.tokenHash, d.createdAt, d.lastSeen, d.revoked ? 1 : 0)
      .run();
  }
  async listDevices() {
    const r = await this.db.prepare('SELECT * FROM devices ORDER BY created_at').all<DeviceSql>();
    return r.results.map(device);
  }
  async revokeDevice(id: string) {
    await this.db.prepare('UPDATE devices SET revoked = 1 WHERE id = ?').bind(id).run();
  }
  async touchDevice(id: string, at: string) {
    await this.db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').bind(at, id).run();
  }
  async addTicket(hash: string, expiresAt: string) {
    await this.db.prepare('INSERT INTO tickets (hash, expires_at) VALUES (?, ?)').bind(hash, expiresAt).run();
  }
  async useTicket(hash: string, now: string) {
    const r = await this.db
      .prepare('UPDATE tickets SET used = 1 WHERE hash = ? AND used = 0 AND expires_at > ?')
      .bind(hash, now)
      .run();
    return r.meta.changes === 1;
  }
  async getRecord(id: string) {
    const r = await this.db.prepare('SELECT * FROM records WHERE id = ?').bind(id).first<RecordSql>();
    return r ? record(r) : null;
  }
  async putRecord(r: Omit<RecordRow, 'seq'>) {
    // Une seule transaction : la séquence et l'écriture sont visibles ensemble, dans l'ordre des séquences.
    // Sinon un appareil pourrait lire une séquence plus récente avant qu'une plus ancienne soit écrite,
    // avancer son curseur et manquer la modification pour de bon.
    const SEQ = "(SELECT value FROM meta WHERE key = 'seq')";
    const deleted = r.deleted ? 1 : 0;
    const res = await this.db.batch([
      this.db.prepare("UPDATE meta SET value = value + 1 WHERE key = 'seq'"),
      // Création (version 1 seulement, et seulement si l'id n'existe pas).
      this.db
        .prepare(
          `INSERT INTO records (id, meta, data, version, seq, deleted)
           SELECT ?1, ?2, ?3, ?4, ${SEQ}, ?5 WHERE ?4 = 1
           ON CONFLICT (id) DO NOTHING`,
        )
        .bind(r.id, r.meta, r.data, r.version, deleted),
      // Mise à jour, seulement si la version suit la version courante.
      this.db
        .prepare(
          `UPDATE records SET meta = ?2, data = ?3, version = ?4, seq = ${SEQ}, deleted = ?5
           WHERE id = ?1 AND ?4 > 1 AND version = ?4 - 1`,
        )
        .bind(r.id, r.meta, r.data, r.version, deleted),
      this.db.prepare(`SELECT ${SEQ} AS value`),
    ]);
    const written = (res[1]?.meta.changes ?? 0) + (res[2]?.meta.changes ?? 0);
    if (written !== 1) return null;
    const row = res[3]?.results?.[0] as { value: number } | undefined;
    if (!row) throw new Error('séquence absente');
    return row.value;
  }
  async aiCountUp(hour: string, max: number) {
    const r = await this.db
      .prepare(
        `INSERT INTO ai_usage (hour, count) VALUES (?1, 1)
         ON CONFLICT (hour) DO UPDATE SET count = count + 1 WHERE ai_usage.count < ?2`,
      )
      .bind(hour, max)
      .run();
    return r.meta.changes === 1;
  }
  async recordsSince(seq: number, limit: number) {
    const r = await this.db
      .prepare('SELECT * FROM records WHERE seq > ? ORDER BY seq LIMIT ?')
      .bind(seq, limit)
      .all<RecordSql>();
    return r.results.map(record);
  }
}
