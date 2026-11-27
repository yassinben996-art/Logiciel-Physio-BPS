// Moteur de synchronisation : envoie les bilans modifiés (chiffrés), reçoit ceux des autres appareils.
// La version attribuée par le relais tranche les conflits ; un bilan ouvert à l'écran n'est jamais remplacé.
import type { Vault } from '../storage/vault';
import { relayApi, RelayError, type RemoteRecord, type SyncConfig } from './api';
import { collectHomeAnswers } from '../homeq/collect';
import type { BilanAction } from '../state/bilan';
import { decodePairing, encodePairing } from './pairing';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline' | 'error';

export const SYNC_LABEL: Readonly<Record<Exclude<SyncStatus, 'off'>, string>> = {
  synced: 'Synchronisé',
  syncing: 'Synchronisation…',
  offline: 'Hors connexion : les modifications partiront au retour du réseau',
  error: 'Erreur de synchronisation',
};

const b64url = (b: Uint8Array) => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) =>
    c.charCodeAt(0),
  );

export async function activateSync(
  v: Vault,
  relayUrl: string,
  setupCode: string,
  deviceName: string,
  f?: typeof fetch,
): Promise<void> {
  try {
    const r = await relayApi(relayUrl, null, f).setup(setupCode.trim(), deviceName);
    const cfg: SyncConfig = { relayUrl, deviceId: r.deviceId, deviceName, token: r.token, cursor: 0 };
    await v.setSyncConfig(cfg);
  } catch (e) {
    if (e instanceof RelayError && e.status === 403)
      throw new Error('Code d’installation incorrect', { cause: e });
    throw e;
  }
}

export async function createPairingCode(
  v: Vault,
  f?: typeof fetch,
): Promise<{ code: string; expiresAt: string }> {
  const cfg = await v.getSyncConfig<SyncConfig>();
  if (!cfg) throw new Error('Synchronisation non activée');
  const t = await relayApi(cfg.relayUrl, cfg.token, f).ticket();
  return { code: encodePairing({ ticket: fromB64url(t.ticket), key: v.keyBytes() }), expiresAt: t.expiresAt };
}

export async function linkDevice(
  v: Vault,
  relayUrl: string,
  code: string,
  deviceName: string,
  f?: typeof fetch,
): Promise<void> {
  const p = decodePairing(code); // lève « Code incorrect : vérifie la saisie »
  let r: { deviceId: string; token: string };
  try {
    r = await relayApi(relayUrl, null, f).redeem(b64url(p.ticket), deviceName);
  } catch (e) {
    if (e instanceof RelayError && e.status === 410)
      throw new Error('Code expiré ou déjà utilisé', { cause: e });
    throw e;
  }
  // Ticket valide : on adopte la clé commune (les bilans déjà présents sont rechiffrés, rien n'est perdu).
  await v.adoptKey(p.key);
  await v.setSyncConfig<SyncConfig>({
    relayUrl,
    deviceId: r.deviceId,
    deviceName,
    token: r.token,
    cursor: 0,
  });
}

/** Réseau absent (fetch échoue) ou relais indisponible : on réessaiera. Tout le reste est une vraie erreur. */
const offline = (e: unknown) =>
  e instanceof TypeError || (e instanceof RelayError && (e.status >= 500 || e.status === 429));

export async function syncOnce(
  v: Vault,
  opts: {
    isOpen: (id: string) => boolean;
    f?: typeof fetch;
    /** Réponses de questionnaires à domicile pour le bilan ouvert à l'écran. */
    applyOpen?: (id: string, a: BilanAction) => Promise<boolean>;
  },
): Promise<{
  status: SyncStatus;
  copied: number;
  openCopied: boolean;
  received: number;
  homeReceived: number;
}> {
  const cfg = await v.getSyncConfig<SyncConfig>();
  if (!cfg) return { status: 'off', copied: 0, openCopied: false, received: 0, homeReceived: 0 };
  const api = relayApi(cfg.relayUrl, cfg.token, opts.f);
  let copied = 0;
  let openCopied = false;
  let received = 0;
  let homeReceived = 0;
  const now = () => new Date().toISOString();
  try {
    // 1. Envoi (plusieurs passes : une copie en conflit créée en route est envoyée aussi).
    for (let pass = 0; pass < 3; pass++) {
      const pending = await v.pending();
      if (!pending.length) break;
      for (const p of pending) {
        const res = await api.put(p.id, p.version, p.meta, p.data, p.deleted);
        if ('version' in res) {
          await v.markSynced(p.id, res.version, p.data.ct);
          continue;
        }
        const c: RemoteRecord | null = res.conflict;
        if (!c) {
          // Le relais ne connaît pas cet enregistrement (relais réinitialisé) : il sera recréé.
          await v.markSynced(p.id, 0, '');
          continue;
        }
        if (opts.isOpen(p.id)) {
          // À l'écran : la version distante devient une copie, la saisie ouverte sera renvoyée par-dessus.
          if ((await v.applyRemote(c, true)) === 'copied') {
            copied++;
            openCopied = true;
          }
        } else if (p.deleted) {
          // Supprimé ici, modifié ailleurs : on garde la version modifiée (rien n'est perdu).
          await v.markSynced(p.id, 0); // base effacée : la version distante sera appliquée telle quelle
          await v.applyRemote(c, false);
        } else {
          // La version arrivée la première au relais reste ; la saisie locale devient une copie.
          await v.keepAsConflictCopy(p.id, now());
          copied++;
          await v.markSynced(p.id, 0); // base effacée : la version distante sera appliquée telle quelle
          await v.applyRemote(c, false);
        }
      }
    }
    // 2. Réception.
    let cursor = cfg.cursor;
    for (;;) {
      const page = await api.since(cursor);
      for (const r of page.records) {
        const open = opts.isOpen(r.id);
        const res = await v.applyRemote(r, open);
        if (res !== 'skipped') received++;
        if (res === 'copied') {
          copied++;
          if (open) openCopied = true;
        }
      }
      cursor = page.cursor;
      if (page.records.length < 200) break;
    }
    if (cursor !== cfg.cursor) await v.setSyncConfig<SyncConfig>({ ...cfg, cursor });
    // 3. Questionnaires à domicile. Une panne ici ne change pas l'état de la synchronisation des bilans.
    try {
      homeReceived = await collectHomeAnswers(v, api, { isOpen: opts.isOpen, applyOpen: opts.applyOpen });
    } catch {
      /* réessayé au prochain tour */
    }
    // Les copies créées à la réception et les réponses intégrées partent tout de suite.
    if ((await v.pending()).length && (copied || homeReceived)) {
      for (const p of await v.pending()) {
        const res = await api.put(p.id, p.version, p.meta, p.data, p.deleted);
        if ('version' in res) await v.markSynced(p.id, res.version, p.data.ct);
      }
    }
    return { status: 'synced', copied, openCopied, received, homeReceived };
  } catch (e) {
    return { status: offline(e) ? 'offline' : 'error', copied, openCopied, received, homeReceived };
  }
}
