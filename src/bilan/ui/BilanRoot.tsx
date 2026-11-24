// Racine du bilan : verrouillage par PIN, « Mes bilans », sauvegarde automatique chiffrée.
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyBilan, type BilanState } from '../state/bilan';
import { createVault, hasVault, unlockVault, type BilanMeta, type Vault } from '../storage/vault';
import BilanApp from './BilanApp';
import BilanList from './BilanList';
import LockScreen from './LockScreen';

const SAVE_DELAY = 500;
const LOCK_AFTER = 15 * 60 * 1000;

type Screen =
  | { k: 'loading' }
  | { k: 'create' }
  | { k: 'unlock' }
  | { k: 'list'; items: BilanMeta[] }
  | { k: 'edit'; bilan: BilanState };

type SaveStatus = 'idle' | 'pending' | 'saved' | 'error';

export default function BilanRoot() {
  const [screen, setScreen] = useState<Screen>({ k: 'loading' });
  const [status, setStatus] = useState<SaveStatus>('idle');
  const vault = useRef<Vault | null>(null);
  const pending = useRef<BilanState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void hasVault().then((has) => alive && setScreen({ k: has ? 'unlock' : 'create' }));
    return () => {
      alive = false;
    };
  }, []);

  /** Enregistre tout de suite ce qui est en attente. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const b = pending.current;
    const v = vault.current;
    if (!b || !v) return;
    try {
      await v.save(b);
      if (pending.current === b) {
        pending.current = null;
        setStatus('saved');
      }
    } catch {
      setStatus('error');
    }
  }, []);

  const onChange = useCallback(
    (b: BilanState) => {
      pending.current = b;
      setStatus('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  const showList = useCallback(async () => {
    await flush();
    const v = vault.current;
    if (v) setScreen({ k: 'list', items: await v.list() });
  }, [flush]);

  const lock = useCallback(async () => {
    await flush();
    vault.current = null;
    setStatus('idle');
    setScreen({ k: 'unlock' });
  }, [flush]);

  const newBilan = useCallback(async () => {
    await flush();
    setStatus('idle');
    setScreen({ k: 'edit', bilan: emptyBilan('shoulder') });
  }, [flush]);

  // Confirmation avant de quitter seulement si une sauvegarde est en attente.
  useEffect(() => {
    if (status !== 'pending') return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [status]);

  // Verrouillage automatique après 15 minutes d'inactivité.
  const unlocked = screen.k === 'list' || screen.k === 'edit';
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
              if (b) {
                setStatus('saved');
                setScreen({ k: 'edit', bilan: b });
              }
            })
          }
          onRemove={(id) => void vault.current?.remove(id).then(() => showList())}
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
