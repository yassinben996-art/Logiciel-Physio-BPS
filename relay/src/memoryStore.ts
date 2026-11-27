// Stockage en mémoire : tests et serveur de développement local.
import { HOME_KEEP_MS, type DeviceRow, type RecordRow, type RelayStore } from './store';

export class MemoryStore implements RelayStore {
  private account = false;
  private devices = new Map<string, DeviceRow>();
  private tickets = new Map<string, { expiresAt: string; used: boolean }>();
  private records = new Map<string, RecordRow>();
  private seq = 0;
  private ai = new Map<string, number>();
  private home = new Map<
    string,
    { expiresAt: string; box: string | null; claimedBy: string | null; claimedAt: string | null }
  >();

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
    if (r.version !== (this.records.get(r.id)?.version ?? 0) + 1) return null;
    const seq = ++this.seq;
    this.records.set(r.id, { ...r, seq });
    return seq;
  }
  async aiCountUp(hour: string, max: number) {
    const n = this.ai.get(hour) ?? 0;
    if (n >= max) return false;
    this.ai.set(hour, n + 1);
    return true;
  }
  async addHomeTicket(hash: string, expiresAt: string, now: string) {
    const old = new Date(new Date(now).getTime() - HOME_KEEP_MS).toISOString();
    for (const [h, r] of this.home)
      if ((r.box === null && r.expiresAt <= now) || r.expiresAt < old) this.home.delete(h);
    this.home.set(hash, { expiresAt, box: null, claimedBy: null, claimedAt: null });
  }
  async submitHome(hash: string, box: string, now: string) {
    const r = this.home.get(hash);
    if (!r || r.box !== null || now >= r.expiresAt) return false;
    r.box = box;
    return true;
  }
  async homeInbox(leaseBefore: string) {
    return [...this.home]
      .filter(([, r]) => r.box !== null && (r.claimedAt === null || r.claimedAt < leaseBefore))
      .map(([h]) => h);
  }
  async claimHome(hash: string, device: string, now: string, leaseBefore: string) {
    const r = this.home.get(hash);
    if (!r || r.box === null || (r.claimedAt !== null && r.claimedAt >= leaseBefore)) return null;
    r.claimedBy = device;
    r.claimedAt = now;
    return r.box;
  }
  async deleteHome(hash: string) {
    this.home.delete(hash);
  }
  async recordsSince(seq: number, limit: number) {
    return [...this.records.values()]
      .filter((r) => r.seq > seq)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }
}
