// Fin de l'accueil : le patient rend la tablette. Reprendre le bilan demande le PIN.
import { useState, type FormEvent } from 'react';

interface Props {
  /** Rejette avec un message à afficher (ex. « PIN incorrect »). */
  onResume: (pin: string) => Promise<void>;
}

export default function Handback({ onResume }: Props) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onResume(pin);
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Erreur inattendue.');
      setBusy(false);
    }
  };
  return (
    <div className="bilan bilan-lock">
      <form className="bilan-lock-card" onSubmit={(e) => void submit(e)}>
        <h1>Merci !</h1>
        <p>Vos réponses sont enregistrées. Vous pouvez rendre la tablette à votre physiothérapeute.</p>
        <div className="field">
          <label htmlFor="handback-pin">PIN du physiothérapeute</label>
          <input
            id="handback-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        {err && (
          <p className="note err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy}>
          Reprendre le bilan
        </button>
      </form>
    </div>
  );
}
