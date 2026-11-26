// « Mes bilans » → Synchronisation : activer, relier, ajouter un appareil (QR code), gérer les appareils.
import { useEffect, useState, type FormEvent } from 'react';
import { relayApi, type RemoteDevice, type SyncConfig } from '../sync/api';
import { activateSync, createPairingCode, linkDevice, SYNC_LABEL, type SyncStatus } from '../sync/engine';
import { pairingLink } from '../sync/pairing';
import type { Vault } from '../storage/vault';
import PairingQr from './PairingQr';

interface Props {
  vault: Vault;
  relayUrl: string;
  status: SyncStatus;
  /** Après activation ou appairage : lancer une synchronisation. */
  onChanged: () => void;
  onSyncNow: () => void;
}

type Mode = 'idle' | 'activate' | 'link' | 'add' | 'devices';
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Erreur inattendue.');
const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-CH', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Zurich',
  });

export default function SyncPanel({ vault, relayUrl, status, onChanged, onSyncNow }: Props) {
  const [cfg, setCfg] = useState<SyncConfig | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>('idle');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [devices, setDevices] = useState<RemoteDevice[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let alive = true;
    void vault.getSyncConfig<SyncConfig>().then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, [vault, status, rev]);

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  };
  const loadDevices = (c: SyncConfig) =>
    run(async () => setDevices(await relayApi(c.relayUrl, c.token).devices()));

  const submitActivate = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await activateSync(vault, relayUrl, code, name.trim() || 'Appareil');
      setMode('idle');
      setCode('');
      setRev((r) => r + 1);
      onChanged();
    });
  };
  const submitLink = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await linkDevice(vault, relayUrl, code, name.trim() || 'Appareil');
      setMode('idle');
      setCode('');
      setRev((r) => r + 1);
      onChanged();
    });
  };

  let body: JSX.Element;
  if (!relayUrl) {
    body = <p className="note">La synchronisation n’est pas encore installée (voir le guide).</p>;
  } else if (cfg === undefined) {
    body = <p className="note">Chargement…</p>;
  } else if (cfg === null) {
    body = (
      <>
        <p className="note">
          Retrouve tes bilans sur ta tablette, ton téléphone et ton ordinateur. Ils restent chiffrés.
        </p>
        {mode === 'idle' && (
          <div className="row">
            <button type="button" className="btn small" onClick={() => setMode('activate')}>
              Activer la synchronisation
            </button>
            <button type="button" className="btn small ghost" onClick={() => setMode('link')}>
              Relier à mes autres appareils
            </button>
          </div>
        )}
        {(mode === 'activate' || mode === 'link') && (
          <form className="sync-form" onSubmit={mode === 'activate' ? submitActivate : submitLink}>
            <div className="f">
              <label htmlFor="sync-code">
                {mode === 'activate' ? 'Code d’installation' : 'Code d’appairage'}
              </label>
              <input
                id="sync-code"
                type={mode === 'activate' ? 'password' : 'text'}
                autoComplete="off"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="f">
              <label htmlFor="sync-name">Nom de cet appareil</label>
              <input id="sync-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="row">
              <button type="submit" className="btn small" disabled={busy}>
                {mode === 'activate' ? 'Activer' : 'Relier'}
              </button>
              <button type="button" className="btn small ghost" onClick={() => setMode('idle')}>
                Annuler
              </button>
            </div>
          </form>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className={`sync-status s-${status}`}>
          {status === 'off' ? 'Synchronisation active' : SYNC_LABEL[status]}
        </p>
        <p className="note">Cet appareil : {cfg.deviceName}</p>
        <div className="row">
          <button type="button" className="btn small ghost" onClick={onSyncNow}>
            Synchroniser maintenant
          </button>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              setMode('add');
              setPairing(null);
              void run(async () => setPairing(await createPairingCode(vault)));
            }}
          >
            Ajouter un appareil
          </button>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              setMode('devices');
              void loadDevices(cfg);
            }}
          >
            Mes appareils
          </button>
        </div>
        {mode === 'add' && pairing && (
          <div className="pairing">
            <PairingQr text={pairingLink(pairing.code, location.origin + location.pathname)} />
            <p>
              Sur le téléphone ou la tablette, scanne ce QR code avec l’appareil photo. Sur un ordinateur,
              tape ce code :
            </p>
            <p className="pairing-code" data-testid="pairing-code">
              {pairing.code}
            </p>
            <p className="note">Valable 10 minutes, une seule fois.</p>
          </div>
        )}
        {mode === 'devices' && devices && (
          <ul className="sync-devices" aria-label="Appareils reliés">
            {devices.map((d) => (
              <li key={d.id}>
                <span>
                  <strong>{d.name}</strong>
                  {d.current ? ' (cet appareil)' : ''}
                  <span className="note"> · dernier contact {when(d.lastSeen)}</span>
                </span>
                {!d.current &&
                  (confirm === d.id ? (
                    <span className="row">
                      <button
                        type="button"
                        className="btn small danger"
                        onClick={() =>
                          void run(async () => {
                            await relayApi(cfg.relayUrl, cfg.token).revoke(d.id);
                            setConfirm(null);
                            setDevices(await relayApi(cfg.relayUrl, cfg.token).devices());
                          })
                        }
                      >
                        Confirmer le retrait
                      </button>
                      <button type="button" className="btn small ghost" onClick={() => setConfirm(null)}>
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn small ghost"
                      aria-label={`Retirer ${d.name}`}
                      onClick={() => setConfirm(d.id)}
                    >
                      Retirer
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
  return (
    <section className="sync-panel" aria-label="Synchronisation">
      <h2>Synchronisation</h2>
      {body}
      {err && (
        <p className="note err" role="alert">
          {err}
        </p>
      )}
    </section>
  );
}
