import { useId, useState, type ReactNode } from 'react';
import { RN } from '../data/refs';
import { EVTXT, LEVELTXT } from '../data/text';
import { num } from '../engine/analyze';
import type { Evidence, Level } from '../engine/types';
import { levelClass } from './style';

export function LevelTag({ level, sub }: { level: Level; sub?: string }) {
  return (
    <span className={`tag ${levelClass(level)}`}>
      <span aria-hidden="true" className="tag-shape" />
      {LEVELTXT[level]}
      {sub ? ` · ${sub}` : ''}
    </span>
  );
}

export function Cite({ refs }: { refs: readonly string[] }) {
  if (!refs.length) return null;
  return (
    <sup className="c">
      {refs.map((k, i) => (
        <span key={k}>
          {i > 0 && ','}
          <a href={`#ref-${k}`} aria-label={`Référence ${RN[k]}`}>
            {RN[k]}
          </a>
        </span>
      ))}
    </sup>
  );
}

export function EvidenceChip({ ev }: { ev: Evidence }) {
  return (
    <span className={`ev ev-${ev}`}>
      <span className="sr-only">Niveau de preuve : </span>
      {EVTXT[ev]}
    </span>
  );
}

interface CheckProps {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
  danger?: boolean;
}

export function Check({ id, checked, onChange, children, hint, danger }: CheckProps) {
  return (
    <label className={`chk${danger ? ' red' : ''}`}>
      <input type="checkbox" data-k={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {children}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

interface NumberFieldProps {
  label: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  hint?: ReactNode;
  id?: string;
  inputMode?: 'numeric' | 'decimal';
}

/**
 * Champ numérique contrôlé tolérant la saisie partielle.
 * Une valeur hors plage est signalée et n'est PAS transmise au moteur (traitée comme non saisie).
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  id,
  inputMode,
}: NumberFieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const [text, setText] = useState(value === null ? '' : String(value));
  const [last, setLast] = useState<number | null>(value);
  const [outOfRange, setOutOfRange] = useState(false);
  if (value !== last) {
    // Mise à jour externe (exemple, réinitialisation) : resynchroniser le texte.
    setLast(value);
    if (num(text.replace(',', '.')) !== value) {
      setText(value === null ? '' : String(value));
      setOutOfRange(false);
    }
  }
  const handle = (t: string) => {
    setText(t);
    const n = num(t.replace(',', '.'));
    const bad = n !== null && (n < min || n > max);
    setOutOfRange(bad);
    const next = bad ? null : n;
    setLast(next);
    onChange(next);
  };
  return (
    <div className="f">
      <label htmlFor={fid}>{label}</label>
      <input
        id={fid}
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode={inputMode ?? (step < 1 ? 'decimal' : 'numeric')}
        value={text}
        aria-invalid={outOfRange || undefined}
        aria-describedby={`${fid}-hint`}
        onChange={(e) => handle(e.target.value)}
      />
      <span id={`${fid}-hint`} className={`note${outOfRange ? ' err' : ''}`} aria-live="polite">
        {outOfRange ? `Valeur hors plage (${min} à ${max}) : non prise en compte.` : hint}
      </span>
    </div>
  );
}
