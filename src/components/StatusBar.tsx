import { DOM } from '../data/domains';
import { LEVELTXT } from '../data/text';
import type { Analysis, DomainId } from '../engine/types';
import { dstyle } from './style';

export function StatusBar({ X, onGo }: { X: Analysis; onGo: (id: DomainId) => void }) {
  return (
    <nav className="status" aria-label="Volets en un coup d’œil">
      <div className="wrap">
        <span className="lbl">Volets</span>
        {DOM.map((d) => {
          const l = X.A[d.id].level;
          return (
            <a
              key={d.id}
              className={`dot l${l}`}
              style={dstyle(d.id)}
              href={`#tr-${d.id}`}
              aria-label={`${d.name} : ${LEVELTXT[l]}`}
              title={`${d.name} : ${LEVELTXT[l]}`}
              onClick={(e) => {
                e.preventDefault();
                onGo(d.id);
              }}
            >
              <i aria-hidden="true">{d.id}</i>
              <span aria-hidden="true">{d.short}</span>
            </a>
          );
        })}
        <a className="dot goplan" href="#s-plan">
          Voir le plan <span aria-hidden="true">↓</span>
        </a>
      </div>
    </nav>
  );
}
