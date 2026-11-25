// Écran du mode patient : l'accueil, puis le remerciement. Seul le PIN du physio permet d'en sortir.
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { INTAKE } from '../content/intake';
import { bilanReducer, type BilanState } from '../state/bilan';
import PatientIntake from './PatientIntake';

interface Props {
  initial: BilanState;
  onChange: (s: BilanState) => void;
  /** Rejette avec un message (« PIN incorrect ») si le PIN est faux. */
  verifyPin: (pin: string) => Promise<void>;
  /** Sortie validée par le PIN ; finished = le patient a appuyé sur « Terminer ». */
  onExit: (s: BilanState, finished: boolean) => void;
}

export default function PatientScreen({ initial, onChange, verifyPin, onExit }: Props) {
  const [s, dispatch] = useReducer(bilanReducer, initial);
  const [done, setDone] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const first = useRef(s);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    if (s !== first.current) cb.current(s);
  }, [s]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await verifyPin(pin);
      onExit(s, done);
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'PIN incorrect');
      setBusy(false);
    }
  };

  return (
    <div className="bilan patient-screen">
      {done ? (
        <div className="patient-done">
          <h1>Merci, vous pouvez rendre la tablette.</h1>
        </div>
      ) : (
        <PatientIntake intake={INTAKE} state={s} dispatch={dispatch} onDone={() => setDone(true)} />
      )}
      <div className="patient-exit">
        {asking ? (
          <form onSubmit={(e) => void submit(e)} className="row">
            <div className="f">
              <label htmlFor="patient-pin">PIN</label>
              <input
                id="patient-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button type="submit" className="btn small" disabled={busy}>
              Revenir au bilan
            </button>
            <button type="button" className="btn small ghost" onClick={() => setAsking(false)}>
              Annuler
            </button>
            {err && (
              <p className="note err" role="alert">
                {err}
              </p>
            )}
          </form>
        ) : (
          <button type="button" className="linkbtn" onClick={() => setAsking(true)}>
            Physio
          </button>
        )}
      </div>
    </div>
  );
}
