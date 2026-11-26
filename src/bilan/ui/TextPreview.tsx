// Aperçu modifiable du texte qui partira (IA) ou sera copié (Claude). Les retouches ne touchent pas au bilan.
import { useId, useState } from 'react';

interface Props {
  title: string;
  initial: string;
  confirmLabel: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
  note?: string;
}

export default function TextPreview({ title, initial, confirmLabel, onConfirm, onCancel, note }: Props) {
  const id = useId();
  const [text, setText] = useState(initial);
  return (
    <div className="text-preview">
      <label htmlFor={id}>{title}</label>
      {note && <p className="note">{note}</p>}
      <textarea id={id} rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button type="button" className="btn small" onClick={() => onConfirm(text)}>
          {confirmLabel}
        </button>
        <button type="button" className="btn small ghost" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
