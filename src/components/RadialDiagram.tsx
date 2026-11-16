import { useSyncExternalStore, type CSSProperties, type KeyboardEvent } from 'react';
import { DOM } from '../data/domains';
import { REGION } from '../data/regions';
import { LEVELTXT, START_LOWER } from '../data/text';
import { ranks } from '../engine/analyze';
import type { Analysis, CaseState, DomainId } from '../engine/types';
import { CX, CY, RN_, labelPlacement, nodePositions, splitLabel } from './radialGeometry';

const NARROW = '(max-width: 520px)';
const subscribe = (cb: () => void) => {
  const m = window.matchMedia?.(NARROW);
  m?.addEventListener('change', cb);
  return () => m?.removeEventListener('change', cb);
};
const useNarrow = () =>
  useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(NARROW).matches,
    () => false,
  );

interface Props {
  c: CaseState;
  X: Analysis;
  onGo: (id: DomainId) => void;
}

export function RadialDiagram({ c, X, onGo }: Props) {
  const rank = ranks(X, 3);
  const compact = useNarrow();
  const pos = nodePositions();
  const key = (id: DomainId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onGo(id);
    }
  };
  const regionName = REGION[c.region].name.split(' ')[0]!;
  return (
    <figure className="radial-wrap">
      <svg
        className={`radial${compact ? ' compact' : ''}`}
        viewBox="-70 -30 660 580"
        role="group"
        aria-label={`Schéma des six volets, ${REGION[c.region].name}`}
      >
        {pos.map((p, i) => (
          <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} className="spoke" />
        ))}
        <g aria-hidden="true">
          <circle cx={CX} cy={CY} r={58} className="hub" />
          <text x={CX} y={CY - 4} textAnchor="middle" className="hub-t1">
            {regionName}
          </text>
          <text x={CX} y={CY + 16} textAnchor="middle" className="hub-t2">
            {c.start === 'na' ? 'STarT : —' : `STarT : ${START_LOWER[c.start]}`}
          </text>
        </g>
        {DOM.map((d, i) => {
          const a = X.A[d.id];
          const p = pos[i]!;
          const l = a.level;
          const lp = labelPlacement(p, compact);
          const lines = lp.vertical ? [d.short] : splitLabel(d.short);
          const lineH = compact ? 24 : 19;
          // Latéral sur 2 lignes : centrer verticalement le bloc sur le nœud.
          const y0 = lp.below
            ? lp.y
            : lp.anchor === 'middle'
              ? lp.y - (lines.length - 1) * lineH
              : lp.y - ((lines.length - 1) * lineH) / 2;
          return (
            <g
              key={d.id}
              className={`node l${l}`}
              style={{ '--dc': `var(${d.c})`, '--dt': `var(${d.t})` } as CSSProperties}
              tabIndex={0}
              role="button"
              aria-label={`${d.name} : ${LEVELTXT[l]}${a.sub ? `, sous-volet ${a.sub}` : ''}${rank[d.id] ? `, priorité ${rank[d.id]}` : ''}`}
              data-go={d.id}
              onClick={() => onGo(d.id)}
              onKeyDown={key(d.id)}
            >
              <circle className="hit" cx={p.x} cy={p.y} r={RN_} />
              <text x={p.x} y={p.y + (a.sub ? 4 : 9)} textAnchor="middle" className="num">
                {d.id}
              </text>
              {a.sub && (
                <text x={p.x} y={p.y + 25} textAnchor="middle" className="subl">
                  {a.sub}
                </text>
              )}
              <text x={lp.x} y={y0} textAnchor={lp.anchor} className="lbl">
                {lines.map((t, k) => (
                  <tspan key={k} x={lp.x} dy={k === 0 ? 0 : lineH}>
                    {t}
                  </tspan>
                ))}
              </text>
              {rank[d.id] && (
                <g className="rank">
                  <circle cx={p.x + 34} cy={p.y - 34} r={13} />
                  <text x={p.x + 34} y={p.y - 29} textAnchor="middle">
                    {rank[d.id]}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="legend">
        <span>
          <i className="lg lg2" aria-hidden="true" />
          Présent (disque plein)
        </span>
        <span>
          <i className="lg lg1" aria-hidden="true" />À surveiller (bord en tirets)
        </span>
        <span>
          <i className="lg lg0" aria-hidden="true" />
          Sans signal (disque neutre)
        </span>
        <span>
          <i className="lg lgr" aria-hidden="true">
            1
          </i>
          Rang de priorité
        </span>
      </figcaption>
    </figure>
  );
}
