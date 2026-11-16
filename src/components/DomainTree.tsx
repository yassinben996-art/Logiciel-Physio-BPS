import { DESC, domain } from '../data/domains';
import { ranks } from '../engine/analyze';
import { interventions } from '../engine/interventions';
import { targets } from '../engine/targets';
import type { Analysis, CaseState, DomainId } from '../engine/types';
import type { OpenMap } from '../state/reducer';
import { isOpen } from '../state/open';
import { Cite, EvidenceChip, LevelTag } from './ui';
import { dstyle } from './style';

interface Props {
  c: CaseState;
  X: Analysis;
  open: OpenMap;
  hideEmpty: boolean;
  onToggle: (id: DomainId, open: boolean) => void;
}

export function DomainTree({ c, X, open, hideEmpty, onToggle }: Props) {
  const rank = ranks(X);
  const ord = X.order.filter((i) => !(hideEmpty && X.A[i].level === 0));
  return (
    <div className="tree">
      {ord.map((i) => {
        const a = X.A[i];
        const l = a.level;
        const o = isOpen(i, X, open);
        return (
          <details
            key={i}
            id={`tr-${i}`}
            className={l === 0 ? 'l0' : ''}
            style={dstyle(i)}
            open={o}
            onToggle={(e) => {
              const now = (e.currentTarget as HTMLDetailsElement).open;
              if (now !== o) onToggle(i, now);
            }}
          >
            <summary>
              <span className="badge" aria-hidden="true">
                {i}
              </span>
              <h3>
                <span className="sr-only">Volet {i} : </span>
                {domain(i).name}
              </h3>
              <LevelTag level={l} />
              {a.sub && <span className="tag">Sous-volet {a.sub}</span>}
              {rank[i] && <span className="tag gray">Priorité {rank[i]}</span>}
            </summary>
            <div className="branch">
              <p className="note" style={{ margin: 0 }}>
                {DESC[i]}
              </p>
              {l === 0 ? (
                <p style={{ margin: '10px 0 0' }}>
                  Aucun signal saisi pour ce volet.{' '}
                  {i === 2 ? 'Pas de critère nociplastique retenu.' : 'Rien à travailler ici pour l’instant.'}
                </p>
              ) : (
                <Branch c={c} X={X} id={i} />
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function Branch({ c, X, id }: { c: CaseState; X: Analysis; id: DomainId }) {
  const a = X.A[id];
  const tg = targets(id, c, X);
  const iv = interventions(id, c, X);
  return (
    <>
      <h4>Pourquoi ce volet est {a.level === 2 ? 'allumé' : 'à surveiller'}</h4>
      <ul>{a.reasons.length ? a.reasons.map((r, k) => <li key={k}>{r}</li>) : <li>Signal partiel.</li>}</ul>
      {a.note && <p className="note">{a.note}</p>}

      <h4>
        Cibles de traitement <span className="h4-sub">(suggestions à négocier avec le patient)</span>
      </h4>
      <ul className="tgs">
        {tg.map((t, k) => (
          <li className="tg" key={k}>
            {t}
          </li>
        ))}
      </ul>

      <h4>Interventions</h4>
      <ul className="ivs">
        {iv.map((x, k) => (
          <li className="iv" key={k}>
            <b>{x.t}</b>
            <EvidenceChip ev={x.ev} />
            <Cite refs={x.r} />
            <p>{x.d}</p>
          </li>
        ))}
      </ul>

      {a.refer.length > 0 && (
        <>
          <h4>Orienter si</h4>
          {a.refer.map((t, k) => (
            <div className="refer" key={k}>
              {t}
            </div>
          ))}
        </>
      )}
    </>
  );
}
