// Stockage en mémoire : tests et serveur de développement local.
import type { DeviceRow, RecordRow, RelayStore } from './store';

export class MemoryStore implements RelayStore {
  private account = false;
  private devices = new Map<string, DeviceRow>();
  private tickets = new Map<string, { expiresAt: string; used: boolean }>();
  private records = new Map<string, RecordRow>();
  private seq = 0;

  async hasAccount() {
    return this.account;
  }
  async createAccount(d: DeviceRow) {
    if (this.account) throw new Error('compte existant');
    this.account = true;
    this.devices.set(d.id, { ...d });
  }
  async deviceByTokenHash(h: string) {
    for (const d of this.devices.values()) if (d.tokenHash === h) return { ...d };
    return null;
  }
  async addDevice(d: DeviceRow) {
    this.devices.set(d.id, { ...d });
  }
  async listDevices() {
    return [...this.devices.values()].map((d) => ({ ...d }));
  }
  async revokeDevice(id: string) {
    const d = this.devices.get(id);
    if (d) d.revoked = true;
  }
  async touchDevice(id: string, at: string) {
    const d = this.devices.get(id);
    if (d) d.lastSeen = at;
  }
  async addTicket(hash: string, expiresAt: string) {
    this.tickets.set(hash, { expiresAt, used: false });
  }
  async useTicket(hash: string, now: string) {
    const t = this.tickets.get(hash);
    if (!t || t.used || now >= t.expiresAt) return false;
    t.used = true;
    return true;
  }
  async getRecord(id: string) {
    const r = this.records.get(id);
    return r ? { ...r } : null;
  }
  async putRecord(r: Omit<RecordRow, 'seq'>) {
    const seq = ++this.seq;
    this.records.set(r.id, { ...r, seq });
    return seq;
  }
  async recordsSince(seq: number, limit: number) {
    return [...this.records.values()]
      .filter((r) => r.seq > seq)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }
}
