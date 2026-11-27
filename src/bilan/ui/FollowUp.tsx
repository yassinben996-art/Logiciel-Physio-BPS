// Suivi du patient : date du prochain rebilan (modifiable), délai, fin de prise en charge, bouton « Rebilan ».
import type { Dispatch } from 'react';
import { FOLLOW_WEEKS, nextDue } from '../engine/followup';
import type { BilanAction, BilanState } from '../state/bilan';

interface Props {
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  onRebilan?: () => void;
}

export default function FollowUp({ state: s, dispatch, onRebilan }: Props) {
  const f = s.followUp;
  return (
    <section className="bilan-follow" aria-label="Suivi">
      <div className="f">
        <label htmlFor="follow-due">Prochain rebilan le</label>
        <input
          id="follow-due"
          type="date"
          value={nextDue(s.createdAt, f)}
          disabled={f.closed}
          onChange={(e) => e.target.value && dispatch({ type: 'followUp', due: e.target.value })}
        />
      </div>
      <div className="f">
        <label htmlFor="follow-weeks">Délai</label>
        <select
          id="follow-weeks"
          value={f.weeks}
          disabled={f.closed}
          onChange={(e) => dispatch({ type: 'followUp', weeks: Number(e.target.value) })}
        >
          {FOLLOW_WEEKS.map((w) => (
            <option key={w} value={w}>
              {w} semaine{w > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
      <label className="chip">
        <input
          type="checkbox"
          checked={f.closed}
          onChange={(e) => dispatch({ type: 'followUp', closed: e.target.checked })}
        />
        <span>Fin de prise en charge</span>
      </label>
      {onRebilan && (
        <button type="button" className="btn small" onClick={onRebilan}>
          Rebilan
        </button>
      )}
    </section>
  );
}
