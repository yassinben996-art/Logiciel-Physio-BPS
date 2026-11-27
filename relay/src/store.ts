// Stockage du relais. Il ne contient que des données illisibles (boîtes chiffrées par les appareils),
// des identifiants aléatoires et des empreintes de jetons.

export interface DeviceRow {
  id: string;
  name: string;
  /** Empreinte SHA-256 (hex) du jeton ; le jeton lui-même n'est jamais stocké. */
  tokenHash: string;
  createdAt: string;
  lastSeen: string;
  revoked: boolean;
}

export interface RecordRow {
  id: string;
  /** JSON d'une boîte chiffrée { iv, ct }. */
  meta: string;
  data: string;
  version: number;
  /** Séquence globale croissante (curseur de synchronisation). */
  seq: number;
  deleted: boolean;
}

export interface RelayStore {
  hasAccount(): Promise<boolean>;
  /** Échoue si un compte existe déjà. */
  createAccount(device: DeviceRow): Promise<void>;
  deviceByTokenHash(h: string): Promise<DeviceRow | null>;
  addDevice(d: DeviceRow): Promise<void>;
  listDevices(): Promise<DeviceRow[]>;
  revokeDevice(id: string): Promise<void>;
  touchDevice(id: string, at: string): Promise<void>;
  addTicket(hash: string, expiresAt: string): Promise<void>;
  /** Vrai une seule fois, et seulement avant l'expiration. */
  useTicket(hash: string, now: string): Promise<boolean>;
  getRecord(id: string): Promise<RecordRow | null>;
  /**
   * Écrit l'enregistrement si sa version vaut exactement la version courante + 1 (1 s'il n'existe pas),
   * en une seule opération atomique. Renvoie le nouveau seq, ou null en cas de conflit.
   */
  putRecord(r: Omit<RecordRow, 'seq'>): Promise<number | null>;
  recordsSince(seq: number, limit: number): Promise<RecordRow[]>;
  /** Compte un appel à l'IA pour cette heure ; faux (sans compter) si la limite est atteinte. Atomique. */
  aiCountUp(hour: string, max: number): Promise<boolean>;

  // Questionnaires à domicile (boîte aux lettres par ticket ; seule l'empreinte du ticket est gardée).
  /** Crée le ticket et efface au passage les tickets expirés sans dépôt et les dépôts expirés depuis 30 jours. */
  addHomeTicket(hash: string, expiresAt: string, now: string): Promise<void>;
  /** Dépose la boîte : vrai une seule fois, et seulement avant l'expiration. Atomique. */
  submitHome(hash: string, box: string, now: string): Promise<boolean>;
  /** Empreintes déposées, non relevées ou dont le bail a commencé avant leaseBefore. */
  homeInbox(leaseBefore: string): Promise<string[]>;
  /** Relève la boîte pour un appareil (bail) ; null si absente ou relevée par un autre. Atomique. */
  claimHome(hash: string, device: string, now: string, leaseBefore: string): Promise<string | null>;
  deleteHome(hash: string): Promise<void>;
}

/** Les dépôts non relevés sont gardés 30 jours après l'expiration du ticket. */
export const HOME_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
