// Body chart à dessiner : souris, doigt ou stylet (Pointer Events). Deux vues, face et dos.
import { useId, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { SILHOUETTE, VIEW_H, VIEW_W, type Stroke, type View } from '../bodychart/geometry';
import type { PenDef } from '../content/types';

interface Props {
  strokes: readonly Stroke[];
  /** Un seul crayon → pas de sélecteur. */
  pens: readonly PenDef[];
  by: 'patient' | 'physio';
  onStroke: (s: Stroke) => void;
  /** Absent → pas de gomme. */
  onErase?: (index: number) => void;
  /** Absent → pas de bouton « Annuler ». */
  onUndo?: () => void;
}

const VIEWS: readonly { view: View; title: string; left: string; right: string }[] = [
  // De face, la droite du patient est à gauche de l'image ; de dos, à droite.
  { view: 'front', title: 'Face', left: 'D', right: 'G' },
  { view: 'back', title: 'Dos', left: 'G', right: 'D' },
];
const r1 = (v: number) => Math.round(v * 10) / 10;
const pointsAttr = (pts: readonly number[]) => {
  const out: string[] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) out.push(`${pts[i]},${pts[i + 1]}`);
  return out.join(' ');
};

export default function BodyChart({ strokes, pens, by, onStroke, onErase, onUndo }: Props) {
  const name = useId();
  const [pen, setPen] = useState(pens[0]?.id ?? '');
  const [erasing, setErasing] = useState(false);
  const [live, setLive] = useState<{ view: View; pts: number[] } | null>(null);
  const drawing = useRef<{ view: View; pts: number[] } | null>(null);
  const color = (id: string) => pens.find((p) => p.id === id)?.color ?? '#555';

  const toView = (e: RPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      r1(((e.clientX - r.left) / r.width) * VIEW_W),
      r1(((e.clientY - r.top) / r.height) * VIEW_H),
    ] as const;
  };
  const down = (view: View) => (e: RPointerEvent<SVGSVGElement>) => {
    if (erasing) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = toView(e);
    drawing.current = { view, pts: [x, y] };
    setLive({ ...drawing.current });
  };
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drawing.current;
    if (!d) return;
    const [x, y] = toView(e);
    const lx = d.pts[d.pts.length - 2]!;
    const ly = d.pts[d.pts.length - 1]!;
    if (Math.hypot(x - lx, y - ly) < 1) return;
    d.pts.push(x, y);
    setLive({ view: d.view, pts: [...d.pts] });
  };
  const up = () => {
    const d = drawing.current;
    drawing.current = null;
    setLive(null);
    // Un trait d'un seul point (simple clic ou toucher) n'est pas enregistré.
    if (d && d.pts.length >= 4) onStroke({ pen, view: d.view, by, pts: d.pts });
  };

  return (
    <div className="bc">
      <div className="bc-tools">
        {pens.length > 1 && (
          <fieldset className="bc-pens">
            <legend>Crayon</legend>
            {pens.map((p) => (
              <label key={p.id} className="chip">
                <input
                  type="radio"
                  name={name}
                  checked={pen === p.id}
                  onChange={() => {
                    setPen(p.id);
                    setErasing(false);
                  }}
                />
                <span>
                  <span className="bc-swatch" style={{ background: p.color }} aria-hidden="true" />
                  {p.label}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {onErase && (
          <button
            type="button"
            className="btn small ghost"
            aria-pressed={erasing}
            onClick={() => setErasing(!erasing)}
          >
            Gomme
          </button>
        )}
        {onUndo && (
          <button type="button" className="btn small ghost" disabled={strokes.length === 0} onClick={onUndo}>
            Annuler le dernier trait
          </button>
        )}
      </div>
      {erasing && <p className="note">Touche un trait pour l’effacer.</p>}
      <div className="bc-views">
        {VIEWS.map((v) => (
          <figure key={v.view} className="bc-view">
            <figcaption>{v.title}</figcaption>
            <div className="bc-frame">
              <span className="bc-side l" aria-hidden="true">
                {v.left}
              </span>
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                role="img"
                aria-label={`Body chart, vue ${v.view === 'front' ? 'de face' : 'de dos'}`}
                className={erasing ? 'erasing' : undefined}
                onPointerDown={down(v.view)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              >
                {SILHOUETTE.map((poly, k) => (
                  <polygon key={k} points={pointsAttr(poly)} className="bc-body" />
                ))}
                {strokes.map((s, k) =>
                  s.view === v.view ? (
                    <polyline
                      key={k}
                      points={pointsAttr(s.pts)}
                      className="bc-stroke"
                      stroke={color(s.pen)}
                      onPointerDown={erasing && onErase ? () => onErase(k) : undefined}
                    />
                  ) : null,
                )}
                {live && live.view === v.view && (
                  <polyline points={pointsAttr(live.pts)} className="bc-stroke" stroke={color(pen)} />
                )}
              </svg>
              <span className="bc-side r" aria-hidden="true">
                {v.right}
              </span>
            </div>
          </figure>
        ))}
      </div>
      {pens.length > 1 && (
        <ul className="bc-legend" aria-label="Légende">
          {pens.map((p) => (
            <li key={p.id}>
              <span className="bc-swatch" style={{ background: p.color }} aria-hidden="true" />
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
