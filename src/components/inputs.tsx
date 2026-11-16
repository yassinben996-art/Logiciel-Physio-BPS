// Contrôles tactiles du parcours patient (et réutilisés en version compacte côté physio).
// Tous reposent sur de vrais <input> radio / checkbox : clavier et lecteurs d'écran fonctionnent.
import type { ReactNode } from 'react';

export interface Option<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ChoiceProps<T extends string> {
  name: string;
  legend: ReactNode;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  compact?: boolean;
}

/** Choix unique sous forme de grandes cartes. */
export function ChoiceCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  compact,
}: ChoiceProps<T>) {
  return (
    <fieldset className={`q${compact ? ' compact' : ''}`}>
      <legend className="q-legend">{legend}</legend>
      <div className={`choices${options.some((o) => o.icon) ? ' with-icons' : ''}`}>
        {options.map((o) => (
          <label key={o.value} className="choice">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.icon && <span className="choice-ico">{o.icon}</span>}
            <span className="choice-label">{o.label}</span>
            <span className="choice-tick" aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ScaleProps {
  name: string;
  legend: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  lo: string;
  hi: string;
  compact?: boolean;
}

/** Échelle de 0 à 10 : onze pastilles à toucher, extrémités libellées. */
export function Scale({ name, legend, value, onChange, lo, hi, compact }: ScaleProps) {
  return (
    <fieldset className={`q scale-q${compact ? ' compact' : ''}`}>
      <legend className="q-legend">{legend}</legend>
      <div className="scale">
        {Array.from({ length: 11 }, (_, n) => (
          <label key={n} className="scale-n" style={{ '--i': n } as React.CSSProperties}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className="scale-ends" aria-hidden="true">
        <span>0 · {lo}</span>
        <span>{hi} · 10</span>
      </div>
      {value !== null && compact && (
        <button type="button" className="linkbtn" onClick={() => onChange(null)}>
          Effacer la réponse
        </button>
      )}
    </fieldset>
  );
}

interface ChipsProps {
  legend: ReactNode;
  items: readonly { id: string; label: string }[];
  checked: Readonly<Record<string, boolean>>;
  onToggle: (id: string, v: boolean) => void;
  /** Bouton « aucun » : décoche tout. */
  noneLabel?: string;
  compact?: boolean;
}

/** Choix multiple sous forme de pastilles. */
export function Chips({ legend, items, checked, onToggle, noneLabel, compact }: ChipsProps) {
  const any = items.some((i) => checked[i.id]);
  return (
    <fieldset className={`q${compact ? ' compact' : ''}`}>
      <legend className="q-legend">{legend}</legend>
      <div className="chips">
        {items.map((i) => (
          <label key={i.id} className="chip">
            <input
              type="checkbox"
              checked={!!checked[i.id]}
              onChange={(e) => onToggle(i.id, e.target.checked)}
            />
            <span>{i.label}</span>
          </label>
        ))}
        {noneLabel && (
          <button
            type="button"
            className="chip chip-none"
            aria-pressed={!any}
            onClick={() => items.forEach((i) => checked[i.id] && onToggle(i.id, false))}
          >
            {noneLabel}
          </button>
        )}
      </div>
    </fieldset>
  );
}

/** Petite silhouette, zone concernée mise en évidence. */
export function BodyIcon({ zone }: { zone: 'cervical' | 'lumbar' | 'shoulder' }) {
  return (
    <svg viewBox="0 0 64 72" className="body-ico" aria-hidden="true" focusable="false">
      <circle cx="32" cy="12" r="8" className="b" />
      <rect x="28.5" y="19" width="7" height="7" rx="2" className={zone === 'cervical' ? 'hl' : 'b'} />
      <path d="M17 30c0-4 3-6 7-6h16c4 0 7 2 7 6v26c0 3-2 5-5 5H22c-3 0-5-2-5-5z" className="b" />
      <path d="M17 31l-6 22M47 31l6 22" className="limb" />
      {zone === 'shoulder' && <circle cx="19.5" cy="29" r="6" className="hl" />}
      {zone === 'lumbar' && <ellipse cx="32" cy="51" rx="10" ry="6" className="hl" />}
    </svg>
  );
}
