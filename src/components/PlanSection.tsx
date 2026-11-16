import type { Dispatch } from 'react';
import type { Analysis, CaseState, DomainId } from '../engine/types';
import type { Action, OpenMap } from '../state/reducer';
import { DomainTree } from './DomainTree';
import { ExportBar } from './ExportBar';
import { LimitsSection } from './LimitsSection';
import { PriorityList } from './PriorityList';
import { RadialDiagram } from './RadialDiagram';
import { FlagAlert } from './RedFlags';
import { References } from './References';

interface Props {
  c: CaseState;
  X: Analysis;
  open: OpenMap;
  hideEmpty: boolean;
  dispatch: Dispatch<Action>;
  onGo: (id: DomainId) => void;
}

const ALL: DomainId[] = [1, 2, 3, 4, 5, 6];

export function PlanSection({ c, X, open, hideEmpty, dispatch, onGo }: Props) {
  return (
    <div id="s-plan" className="plan-page">
      <FlagAlert X={X} />
      <section className="panel plan-hero">
        <div className="plan">
          <RadialDiagram c={c} X={X} onGo={onGo} />
          <div className="plan-side">
            <PriorityList X={X} onGo={onGo} />
            {c.goal.trim() && (
              <div className="goalbox">
                <span className="eyebrow">Objectif du patient</span>
                <p>« {c.goal.trim()} »</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>Détail par volet</h2>
          <div className="row noprint">
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'openMany', ids: ALL, value: true })}
            >
              Tout déplier
            </button>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'openMany', ids: ALL, value: false })}
            >
              Tout replier
            </button>
            <label className="toggle">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => dispatch({ type: 'hideEmpty', value: e.target.checked })}
              />
              <span>Masquer les volets sans signal</span>
            </label>
          </div>
        </div>
        <DomainTree
          c={c}
          X={X}
          open={open}
          hideEmpty={hideEmpty}
          onToggle={(id, v) => dispatch({ type: 'open', id, value: v })}
        />
      </section>

      <ExportBar c={c} />

      <details className="panel fold">
        <summary>
          <h2>Limites et esprit critique</h2>
        </summary>
        <LimitsSection />
      </details>
      <details className="panel fold" id="s-refs">
        <summary>
          <h2>Références</h2>
        </summary>
        <References />
      </details>
    </div>
  );
}
