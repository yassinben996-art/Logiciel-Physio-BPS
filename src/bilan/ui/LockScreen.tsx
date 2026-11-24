// Écran de verrouillage : création du PIN (premier lancement) ou déverrouillage.
import { useState, type FormEvent } from 'react';

export const PIN_WARNING =
  'Si tu oublies ce PIN, tes bilans seront perdus : ils sont chiffrés et personne ne peut les récupérer.';

interface Props {
  mode: 'create' | 'unlock';
  /** Rejette avec un message à afficher. */
  onSubmit: (pin: string) => Promise<void>;
}

export default function LockScreen({ mode, onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mode === 'create') {
      if (!/^\d{6}$/.test(pin)) return setErr('Le PIN doit comporter exactement 6 chiffres.');
      if (pin !== pin2) return setErr('Les deux PIN ne correspondent pas.');
    }
    setBusy(true);
    try {
      await onSubmit(pin);
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Erreur inattendue.');
      setBusy(false);
    }
  };
  const pinInput = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="f">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={value}
        onChange={(e) => set(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
  return (
    <div className="bilan-lock">
      <form onSubmit={(e) => void submit(e)} className="bilan-lock-card">
        <p className="eyebrow">Bilan standardisé</p>
        <h1>{mode === 'create' ? 'Crée ton PIN' : 'Déverrouiller'}</h1>
        {mode === 'create' ? (
          <>
            <p>Tes bilans sont enregistrés chiffrés sur cet appareil. Le PIN les protège.</p>
            <p className="bilan-warn">{PIN_WARNING}</p>
            {pinInput('pin-new', 'PIN (6 chiffres)', pin, setPin)}
            {pinInput('pin-new2', 'Confirme le PIN', pin2, setPin2)}
          </>
        ) : (
          pinInput('pin', 'PIN', pin, setPin)
        )}
        {err && (
          <p className="note err" role="alert">
            {err}
          </p>
        )}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'create' ? 'Créer le PIN' : 'Déverrouiller'}
        </button>
      </form>
    </div>
  );
}
