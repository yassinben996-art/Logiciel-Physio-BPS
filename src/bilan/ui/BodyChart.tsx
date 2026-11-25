// Body chart : silhouettes de face et de dos faites de zones à toucher. Sans onToggle, lecture seule.
import { useState, type KeyboardEvent } from 'react';
import { BODY_REGIONS, type BodyView } from '../content/body';

interface Props {
  selected: readonly string[];
  onToggle?: (id: string) => void;
}

const VIEWS: readonly { view: BodyView; label: string; left: string; right: string }[] = [
  { view: 'face', label: 'De face', left: 'D', right: 'G' },
  { view: 'dos', label: 'De dos', left: 'G', right: 'D' },
];

export default function BodyChart({ selected, onToggle }: Props) {
  const on = new Set(selected);
  const [active, setActive] = useState<BodyView>('face');
  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle?.(id);
    }
  };
  const chosen = BODY_REGIONS.filter((r) => on.has(r.id)).map((r) => r.label);
  return (
    <div className={`bodychart${onToggle ? '' : ' readonly'}`}>
      {onToggle && (
        <div className="bodychart-switch" role="group" aria-label="Vue du dessin">
          {VIEWS.map(({ view, label }) => (
            <button
              key={view}
              type="button"
              className="btn small ghost"
              aria-pressed={active === view}
              onClick={() => setActive(view)}
            >
              {label === 'De face' ? 'Voir de face' : 'Voir de dos'}
            </button>
          ))}
        </div>
      )}
      <div className="bodychart-views">
        {VIEWS.map(({ view, label, left, right }) => (
          <figure
            key={view}
            role="group"
            aria-label={label}
            className={`bodychart-view${active === view ? ' active' : ''}`}
          >
            <svg viewBox="0 0 120 245" focusable="false">
              {BODY_REGIONS.filter((r) => r.view === view).map((r) =>
                onToggle ? (
                  <rect
                    key={r.id}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={Math.min(6, r.w / 2)}
                    role="button"
                    tabIndex={0}
                    aria-label={r.label}
                    aria-pressed={on.has(r.id)}
                    className={on.has(r.id) ? 'on' : undefined}
                    onClick={() => onToggle(r.id)}
                    onKeyDown={key(r.id)}
                  >
                    <title>{r.label}</title>
                  </rect>
                ) : (
                  <rect
                    key={r.id}
                    x={r.x}
                    y={r.y}
                    width={r.w}
                    height={r.h}
                    rx={Math.min(6, r.w / 2)}
                    aria-hidden="true"
                    className={on.has(r.id) ? 'on' : undefined}
                  />
                ),
              )}
            </svg>
            <figcaption>
              <span>{left}</span>
              <span>{label}</span>
              <span>{right}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {!onToggle && (
        <p className="note">{chosen.length ? `Zones : ${chosen.join(', ')}` : 'Aucune zone indiquée.'}</p>
      )}
    </div>
  );
}
