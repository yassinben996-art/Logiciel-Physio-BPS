// Racine du bilan : verrouillage par PIN, « Mes bilans », sauvegarde automatique chiffrée.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZoneDef } from '../content/types';
import { ZONES } from '../content';
import { bilanReducer, emptyBilan, type BilanState } from '../state/bilan';
import type { Intake } from '../state/intake';
import { createVault, hasVault, unlockVault, type BilanMeta, type Vault } from '../storage/vault';
import BilanApp from './BilanApp';
import BilanList from './BilanList';
import Handback from './Handback';
import IntakeForm from './IntakeForm';
import LockScreen from './LockScreen';
import ZonePicker from './ZonePicker';

const SAVE_DELAY = 500;
const LOCK_AFTER = 15 * 60 * 1000;

type Screen =
  | { k: 'loading' }
  | { k: 'create' }
  | { k: 'unlock' }
  | { k: 'list'; items: BilanMeta[] }
  | { k: 'zone' }
  | { k: 'edit'; bilan: BilanState }
  | { k: 'intake'; bilan: BilanState }
  | { k: 'handback'; bilan: BilanState; saved: boolean };

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export default function BilanRoot() {
  const [screen, setScreen] = useState<Screen>({ k: 'loading' });
  const [status, setStatus] = useState<SaveStatus>('idle');
  const vault = useRef<Vault | null>(null);
  const pending = useRef<BilanState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Dernier état connu du bilan ouvert (pour l'accueil patient). */
  const latest = useRef<BilanState | null>(null);

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
      latest.current = b;
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

  const openBilan = useCallback((b: BilanState, st: SaveStatus) => {
    latest.current = b;
    setStatus(st);
    setScreen({ k: 'edit', bilan: b });
  }, []);

  /** Accueil patient : enregistrer, puis tendre la tablette (aucune donnée d'identité à l'écran). */
  const startIntake = useCallback(async () => {
    if (!(await leave())) return;
    const b = latest.current;
    if (b) setScreen({ k: 'intake', bilan: b });
  }, [leave]);

  const finishIntake = useCallback(
    async (b: BilanState, intake: Intake) => {
      const next = bilanReducer(b, { type: 'intake', intake });
      latest.current = next;
      pending.current = next;
      const saved = await flush();
      setScreen({ k: 'handback', bilan: next, saved });
    },
    [flush],
  );

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
  const unlocked = screen.k === 'list' || screen.k === 'edit' || screen.k === 'zone';
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

  switch (screen.k) {
    case 'loading':
      return <p className="bilan note">Chargement…</p>;
    case 'create':
    case 'unlock':
      return (
        <LockScreen
          key={screen.k}
          mode={screen.k}
          onSubmit={async (pin) => {
            vault.current = screen.k === 'create' ? await createVault(pin) : await unlockVault(pin);
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
              if (b) openBilan(b, 'saved');
            })
          }
          onRemove={(id) => void vault.current?.remove(id).then(() => showList())}
        />
      );
    case 'zone':
      return (
        <ZonePicker
          onPick={(zone: ZoneDef['id']) => openBilan(emptyBilan(zone), 'idle')}
          onCancel={() => void showList()}
        />
      );
    case 'intake':
      return (
        <IntakeForm
          zoneLabel={ZONES[screen.bilan.zone]?.label ?? ''}
          initial={screen.bilan.intake}
          onDraft={(i) => onChange(bilanReducer(screen.bilan, { type: 'intake', intake: i }))}
          onDone={(i) => void finishIntake(screen.bilan, i)}
        />
      );
    case 'handback':
      return (
        <Handback
          saved={screen.saved}
          onResume={async (pin) => {
            await unlockVault(pin);
            // Nouvel essai d'enregistrement si le premier a échoué ; l'erreur reste visible sinon.
            const ok = screen.saved || (await flush());
            openBilan(screen.bilan, ok ? 'saved' : 'error');
          }}
        />
      );
    case 'edit':
      return (
        <BilanApp
          key={screen.bilan.id}
          initial={screen.bilan}
          onChange={onChange}
          onNew={() => void newBilan()}
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
              <button type="button" className="btn small" onClick={() => void startIntake()}>
                Accueil patient
              </button>
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
