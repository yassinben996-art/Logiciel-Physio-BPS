import { QUESTIONNAIRES } from '@q';
import { disBand } from '../engine/analyze';
import type { CaseState } from '../engine/types';
import { appliesTo, scoreQ } from '../questionnaires/scoring';
import type { QAnswers } from '../state/reducer';

/** Résultats des questionnaires remplis par le patient (version personnelle uniquement). */
export function QResults({
  c,
  qa,
  off = {},
  compact,
}: {
  c: CaseState;
  qa: QAnswers;
  off?: Readonly<Record<string, boolean>>;
  compact?: boolean;
}) {
  const rows = QUESTIONNAIRES.filter((q) => !off[q.id] && appliesTo(q, c.region))
    .map((q) => ({ q, r: scoreQ(q, qa[q.id]) }))
    .filter((x) => x.r);
  if (!QUESTIONNAIRES.length) return null;
  return (
    <section className={compact ? 'qres compact' : 'panel qres'} aria-labelledby="h-qres">
      <h2 id="h-qres" className={compact ? 'h-prio' : 'h-qres'}>
        Questionnaires remplis par le patient
      </h2>
      {rows.length === 0 ? (
        <p className="note">Aucun questionnaire rempli pour l’instant.</p>
      ) : (
        <ul>
          {rows.map(({ q, r }) => (
            <li key={q.id} className={r!.valid ? '' : 'invalid'}>
              <div className="qres-top">
                <b>{q.name}</b>
                <span className="qres-v">{r!.display}</span>
              </div>
              <div className="qres-meta">
                {q.feeds?.field === 'dis' && r!.valid && <span>{disBand(q.feeds.instr, r!.value)}</span>}
                {r!.note && <span>{r!.note}</span>}
                {r!.parts?.map((x) => (
                  <span key={x}>{x}</span>
                ))}
                {r!.answered < r!.expected && (
                  <span>
                    {r!.answered} réponses sur {r!.expected}
                  </span>
                )}
                {!r!.valid && <span>non transmis au calcul des volets</span>}
              </div>
              {q.warning && <p className="qres-warn">⚠ {q.warning}</p>}
              {!compact && <p className="note">{q.source}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
