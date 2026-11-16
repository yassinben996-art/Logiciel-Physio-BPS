import { DESC, domain } from '../data/domains';
import type { Analysis, DomainId } from '../engine/types';
import { dstyle } from './style';

export function PriorityList({ X, onGo }: { X: Analysis; onGo: (id: DomainId) => void }) {
  const L = X.order.filter((i) => X.A[i].level === 2);
  return (
    <div>
      <h3 className="h3">Axes prioritaires</h3>
      {L.length ? (
        <ol className="prio">
          {L.map((i, k) => {
            const a = X.A[i];
            return (
              <li key={i} style={dstyle(i)}>
                <button type="button" onClick={() => onGo(i)}>
                  <span className="rk" aria-hidden="true">
                    {k + 1}
                  </span>
                  <span>
                    <span className="sr-only">Priorité {k + 1} : </span>
                    <b>{domain(i).name}</b> <span className="tag">Sous-volet {a.sub}</span>
                    <small>{a.reasons.slice(0, 2).join(' · ') || DESC[i]}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty">
          <b>Aucun volet allumé.</b> Coche des observations dans la section 3.
        </p>
      )}
    </div>
  );
}
