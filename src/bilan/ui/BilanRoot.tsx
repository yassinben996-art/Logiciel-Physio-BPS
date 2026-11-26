// Racine du bilan : verrouillage par PIN, « Mes bilans », sauvegarde automatique chiffrée.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZoneDef } from '../content/types';
import { isPatientLocked, onRemoteLock, setPatientLocked } from '../patientGuard';
import { bilanReducer, emptyBilan, type BilanState } from '../state/bilan';
import { createVault, hasVault, unlockVault, type BilanMeta, type Vault } from '../storage/vault';
import BilanApp from './BilanApp';
import BilanList from './BilanList';
import LockScreen from './LockScreen';
import SyncPanel from './SyncPanel';
import { RELAY_URL } from '../sync/config';
import { linkDevice, SYNC_LABEL, syncOnce, type SyncStatus } from '../sync/engine';
import { codeFromHash } from '../sync/pairing';
import { debounce } from '../sync/schedule';
import { openBilanId } from './openBilan';
import ZonePicker from './ZonePicker';
import PatientScreen from './PatientScreen';

const SAVE_DELAY = 500;
const LOCK_AFTER = 15 * 60 * 1000;

type Screen =
  | { k: 'loading' }
  | { k: 'create' }
  | { k: 'unlock' }
  | { k: 'list'; items: BilanMeta[] }
  | { k: 'zone' }
  | { k: 'edit'; bilan: BilanState; rev: number; openIntake?: boolean }
  | { k: 'confirmPatient'; bilan: BilanState }
  | { k: 'patient'; bilan: BilanState }
  | { k: 'link'; code: string };

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export default function BilanRoot() {
  const [screen, setScreen] = useState<Screen>({ k: 'loading' });
  const [status, setStatus] = useState<SaveStatus>('idle');
  const vault = useRef<Vault | null>(null);
  const pending = useRef<BilanState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernier état connu du bilan ouvert (pour lancer le mode patient sur la saisie à jour). */
  const current = useRef<BilanState | null>(null);
  const popGuard = useRef<(() => void) | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  });
  // Lien d'appairage (QR code) : le code est lu, puis retiré de l'adresse.
  const linkCode = useRef<string | null>(codeFromHash(location.hash));
  useEffect(() => {
    if (linkCode.current) history.replaceState(null, '', '#/bilan');
  }, []);

  useEffect(() => {
    let alive = true;
    void hasVault().then((has) => alive && setScreen({ k: has ? 'unlock' : 'create' }));
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Enregistre tout de suite ce qui est en attente, y compris ce qui a été saisi pendant l'enregistrement.
   * Renvoie false si l'enregistrement a échoué : la saisie reste en attente et l'erreur reste affichée.
   */
  /** Envoi après chaque enregistrement réussi (branché plus bas, quand runSync existe). */
  const syncSoon = useRef<(() => void) | null>(null);
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = vault.current;
    while (pending.current && v) {
      const b = pending.current;
      try {
        await v.save(b);
      } catch {
        setStatus('error');
        return false;
      }
      if (pending.current === b) {
        pending.current = null;
        setStatus('saved');
        syncSoon.current?.();
      }
    }
    return true;
  }, []);

  const onChange = useCallback(
    (b: BilanState) => {
      current.current = b;
      pending.current = b;
      setStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  /** Une synchronisation à la fois ; une demande pendant l'exécution relance un tour à la fin. */
  const syncRunning = useRef(false);
  const syncAgain = useRef(false);
  const runSyncRef = useRef<(() => Promise<void>) | null>(null);
  const runSync = useCallback(async (): Promise<void> => {
    const v = vault.current;
    if (!v) return;
    if (syncRunning.current) {
      syncAgain.current = true;
      return;
    }
    syncRunning.current = true;
    try {
      setSyncStatus((s) => (s === 'off' ? s : 'syncing'));
      // Relu à chaque enregistrement reçu : un bilan ouvert pendant la synchronisation est protégé aussi.
      const res = await syncOnce(v, {
        isOpen: (id) => id === openBilanId(screenRef.current, current.current?.id ?? null),
      });
      if (vault.current !== v) return;
      setSyncStatus(res.status);
      if (res.openCopied)
        setSyncNotice(
          'Une autre version de ce bilan est arrivée d’un autre appareil : elle est gardée comme copie dans Mes bilans.',
        );
      // La liste n'est relue que si quelque chose est arrivé, et jamais pour écraser une liste plus récente
      // (par exemple affichée juste après une suppression faite pendant la synchronisation).
      if ((res.received > 0 || res.copied > 0) && screenRef.current.k === 'list') {
        const before = screenRef.current;
        const items = await v.list();
        if (screenRef.current === before && vault.current === v) setScreen({ k: 'list', items });
      }
    } finally {
      syncRunning.current = false;
      if (syncAgain.current) {
        syncAgain.current = false;
        void runSyncRef.current?.();
      }
    }
  }, []);

  const [blocked, setBlocked] = useState(false);
  /** Avant de quitter le bilan : tout enregistrer, sinon rester sur place avec l'erreur visible. */
  const leave = useCallback(async () => {
    const ok = await flush();
    setBlocked(!ok);
    return ok;
  }, [flush]);

  const showList = useCallback(async () => {
    if (!(await leave())) return;
    const v = vault.current;
    if (v) setScreen({ k: 'list', items: await v.list() });
    // En quittant un bilan, l'envoi part tout de suite (sans attendre le délai de regroupement).
    void runSync();
  }, [leave, runSync]);

  /** Lève la garde du mode patient (après saisie du PIN). */
  const releasePatient = useCallback(() => {
    setPatientLocked(false);
    if (popGuard.current) window.removeEventListener('popstate', popGuard.current);
    popGuard.current = null;
  }, []);

  const edit = useCallback((bilan: BilanState, openIntake = false) => {
    current.current = bilan;
    setScreen((sc) => ({ k: 'edit', bilan, rev: (sc.k === 'edit' ? sc.rev : 0) + 1, openIntake }));
  }, []);

  const startPatient = useCallback(async () => {
    if (!(await leave())) return;
    const b = current.current;
    if (!b) return;
    setPatientLocked(true);
    // Le bouton Précédent du navigateur ne fait pas sortir du parcours.
    history.pushState(null, '', location.href);
    const pop = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', pop);
    popGuard.current = pop;
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    setScreen({ k: 'patient', bilan: b });
  }, [leave]);

  const lock = useCallback(async () => {
    if (!(await leave())) return;
    // Dernier envoi avant de verrouiller (la synchronisation garde son accès au coffre jusqu'à la fin).
    void runSync();
    vault.current = null;
    setStatus('idle');
    setScreen({ k: 'unlock' });
  }, [leave, runSync]);

  const newBilan = useCallback(async () => {
    if (!(await leave())) return;
    setScreen({ k: 'zone' });
  }, [leave]);

  // Un autre onglet lance le mode patient : celui-ci se verrouille.
  useEffect(() => onRemoteLock(() => void lock()), [lock]);

  // App mise en arrière-plan ou fermée (tablette, téléphone) : enregistrer sans attendre le délai.
  useEffect(() => {
    const h = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const hide = () => void flush();
    document.addEventListener('visibilitychange', h);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', h);
      window.removeEventListener('pagehide', hide);
    };
  }, [flush]);

  // Confirmation avant de quitter seulement si une saisie n'est pas encore enregistrée.
  useEffect(() => {
    if (status !== 'pending' && status !== 'error') return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [status]);

  // Synchronisation : après chaque enregistrement, au retour sur l'app, et toutes les 60 secondes.
  // Après un enregistrement : on attend 5 s sans nouvelle saisie (une rafale de frappe = un seul envoi,
  // pour rester loin de la limite de requêtes du relais).
  useEffect(() => {
    const d = debounce(() => void runSync(), 5000);
    syncSoon.current = d;
    runSyncRef.current = runSync;
    return () => d.cancel();
  }, [runSync]);
  const syncActive = screen.k !== 'loading' && screen.k !== 'create' && screen.k !== 'unlock';
  useEffect(() => {
    if (!syncActive) return;
    const vis = () => document.visibilityState === 'visible' && void runSync();
    document.addEventListener('visibilitychange', vis);
    const iv = setInterval(() => void runSync(), 60_000);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      clearInterval(iv);
    };
  }, [syncActive, runSync]);

  // Verrouillage automatique après 15 minutes d'inactivité.
  const unlocked =
    screen.k === 'list' ||
    screen.k === 'zone' ||
    screen.k === 'edit' ||
    screen.k === 'confirmPatient' ||
    screen.k === 'patient';
  useEffect(() => {
    if (!unlocked) return;
    let t = setTimeout(() => void lock(), LOCK_AFTER);
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => void lock(), LOCK_AFTER);
    };
    const evs = ['pointerdown', 'keydown', 'input'] as const;
    evs.forEach((e) => window.addEventListener(e, reset, true));
    return () => {
      clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, reset, true));
    };
  }, [unlocked, lock]);

  // Démontage (changement de route) : ne pas perdre la dernière saisie.
  useEffect(() => () => void flush(), [flush]);

  return <div className="bilan-theme">{renderScreen()}</div>;

  function renderScreen() {
    switch (screen.k) {
      case 'loading':
        return <p className="bilan note bilan-theme">Chargement…</p>;
      case 'create':
      case 'unlock':
        return (
          <LockScreen
            key={screen.k}
            mode={screen.k}
            onSubmit={async (pin) => {
              vault.current = screen.k === 'create' ? await createVault(pin) : await unlockVault(pin);
              if (isPatientLocked()) releasePatient();
              if (linkCode.current) {
                setScreen({ k: 'link', code: linkCode.current });
                return;
              }
              await showList();
              void runSync();
            }}
          />
        );
      case 'list':
        return (
          <BilanList
            items={screen.items}
            onNew={() => void newBilan()}
            onLock={() => void lock()}
            onOpen={(id) =>
              void vault.current?.load(id).then((b) => {
                if (b) {
                  setStatus('saved');
                  edit(b);
                }
              })
            }
            onRemove={(id) =>
              void vault.current
                ?.remove(id)
                .then(() => showList())
                .then(() => runSync())
            }
            footer={
              vault.current && (
                <SyncPanel
                  vault={vault.current}
                  relayUrl={RELAY_URL}
                  status={syncStatus}
                  onChanged={() => void runSync()}
                  onSyncNow={() => void runSync()}
                />
              )
            }
          />
        );
      case 'link':
        return (
          <LinkScreen
            relayUrl={RELAY_URL}
            onLink={async (name) => {
              const v = vault.current;
              if (!v) return;
              await linkDevice(v, RELAY_URL, screen.code, name);
              linkCode.current = null;
              await runSync();
              await showList();
            }}
            onCancel={() => {
              linkCode.current = null;
              void showList();
            }}
          />
        );
      case 'zone':
        return (
          <ZonePicker
            onPick={(zone: ZoneDef['id']) => {
              setStatus('idle');
              edit(emptyBilan(zone));
            }}
            onCancel={() => void showList()}
          />
        );
      case 'confirmPatient':
        return (
          <div className="bilan">
            <div className="bilan-lock-card patient-confirm">
              <h1>Accueil patient</h1>
              <p>
                Tu vas tendre la tablette au patient. Il ne verra que ses questions ; ton PIN sera demandé
                pour revenir.
              </p>
              <p className="bilan-warn">
                Pour empêcher de quitter le navigateur, active l’Accès guidé (iPad) ou l’épinglage d’écran
                (Android).
              </p>
              <div className="row">
                <button type="button" className="btn" onClick={() => void startPatient()}>
                  Commencer l’accueil
                </button>
                <button type="button" className="btn ghost" onClick={() => edit(screen.bilan, true)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        );
      case 'patient':
        return (
          <PatientScreen
            initial={screen.bilan}
            onChange={onChange}
            verifyPin={async (pin) => {
              await unlockVault(pin);
            }}
            onExit={(b, finished) => {
              releasePatient();
              const next =
                finished || b.intake.status === 'patient'
                  ? b
                  : bilanReducer(b, { type: 'intakeStatus', status: 'physio' });
              if (next !== b) onChange(next);
              edit(next, true);
            }}
          />
        );
      case 'edit':
        return (
          <BilanApp
            key={`${screen.bilan.id}-${screen.rev}`}
            initial={screen.bilan}
            openIntake={screen.openIntake}
            onChange={onChange}
            onNew={() => void newBilan()}
            onStartPatient={() =>
              current.current && setScreen({ k: 'confirmPatient', bilan: current.current })
            }
            toolbar={
              <>
                <span className={`bilan-save s-${status}`} role="status">
                  {status === 'pending'
                    ? 'Enregistrement…'
                    : status === 'saved'
                      ? 'Enregistré'
                      : status === 'error'
                        ? 'Échec de l’enregistrement'
                        : ''}
                </span>
                {syncStatus !== 'off' && (
                  <span className={`sync-status s-${syncStatus}`}>{SYNC_LABEL[syncStatus]}</span>
                )}
                {syncNotice && (
                  <span className="note err" role="alert">
                    {syncNotice}
                  </span>
                )}
                {blocked && (
                  <span className="note err" role="alert">
                    La dernière saisie n’est pas enregistrée : impossible de quitter ce bilan pour l’instant.
                  </span>
                )}
                <button type="button" className="btn small ghost" onClick={() => void showList()}>
                  Mes bilans
                </button>
                <button type="button" className="btn small ghost" onClick={() => void lock()}>
                  Verrouiller
                </button>
              </>
            }
          />
        );
    }
  }
}

/** Écran « Relier cet appareil », ouvert par le lien du QR code après le PIN. */
function LinkScreen({
  relayUrl,
  onLink,
  onCancel,
}: {
  relayUrl: string;
  onLink: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="bilan">
      <div className="bilan-lock-card">
        <h1>Relier cet appareil</h1>
        {!relayUrl ? (
          <p className="note">La synchronisation n’est pas encore installée (voir le guide).</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              setBusy(true);
              void onLink(name.trim() || 'Appareil').catch((x: unknown) => {
                setErr(x instanceof Error ? x.message : 'Erreur inattendue.');
                setBusy(false);
              });
            }}
          >
            <p>Tes bilans des autres appareils vont arriver ici ; ceux déjà présents sont gardés.</p>
            <div className="f">
              <label htmlFor="link-name">Nom de cet appareil</label>
              <input id="link-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {err && (
              <p className="note err" role="alert">
                {err}
              </p>
            )}
            <div className="row">
              <button type="submit" className="btn" disabled={busy}>
                Relier
              </button>
              <button type="button" className="btn ghost" onClick={onCancel}>
                Plus tard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
