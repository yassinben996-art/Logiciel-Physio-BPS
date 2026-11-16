import type { Dispatch } from 'react';
import type { Analysis, CaseState, DomainId } from '../engine/types';
import type { Action, OpenMap } from '../state/reducer';
import { DomainTree } from './DomainTree';
import { PriorityList } from './PriorityList';
import { RadialDiagram } from './RadialDiagram';
import { FlagAlert } from './RedFlags';

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
    <section className="card" id="s-plan" aria-labelledby="h-plan">
      <h2 id="h-plan">
        <span className="n" aria-hidden="true">
          4
        </span>
        Plan : les volets sur lesquels travailler
      </h2>
      <p className="sub">
        Clique un volet du schéma ou de la liste. Chaque branche se déplie pour montrer pourquoi il est
        allumé, les cibles de traitement, les interventions et leur niveau de preuve.
      </p>
      <FlagAlert X={X} />
      <div className="plan">
        <RadialDiagram c={c} X={X} onGo={onGo} />
        <div>
          <PriorityList X={X} onGo={onGo} />
          {c.goal.trim() && (
            <div className="goalbox">
              <b>Objectif du patient</b>
              <p>« {c.goal.trim()} »</p>
            </div>
          )}
        </div>
      </div>
      <div className="row noprint treebar">
        <button
          type="button"
          className="btn ghost"
          onClick={() => dispatch({ type: 'openMany', ids: ALL, value: true })}
        >
          Tout déplier
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => dispatch({ type: 'openMany', ids: ALL, value: false })}
        >
          Tout replier
        </button>
        <label className="chk compact">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={(e) => dispatch({ type: 'hideEmpty', value: e.target.checked })}
          />
          <span>Masquer les volets sans signal</span>
        </label>
      </div>
      <DomainTree
        c={c}
        X={X}
        open={open}
        hideEmpty={hideEmpty}
        onToggle={(id, v) => dispatch({ type: 'open', id, value: v })}
      />
    </section>
  );
}
