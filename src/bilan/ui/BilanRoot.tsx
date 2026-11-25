// Racine du bilan : verrouillage par PIN, « Mes bilans », sauvegarde automatique chiffrée.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZoneDef } from '../content/types';
import { isPatientLocked, onRemoteLock, setPatientLocked } from '../patientGuard';
import { bilanReducer, emptyBilan, type BilanState } from '../state/bilan';
import { createVault, hasVault, unlockVault, type BilanMeta, type Vault } from '../storage/vault';
import BilanApp from './BilanApp';
import BilanList from './BilanList';
import LockScreen from './LockScreen';
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
  | { k: 'patient'; bilan: BilanState };

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
  }, [leave]);

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
    vault.current = null;
    setStatus('idle');
    setScreen({ k: 'unlock' });
  }, [leave]);

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
              await showList();
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
            onRemove={(id) => void vault.current?.remove(id).then(() => showList())}
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
