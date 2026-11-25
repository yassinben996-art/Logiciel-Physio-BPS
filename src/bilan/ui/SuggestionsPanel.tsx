// Panneau des suggestions du moteur de règles : chaque suggestion montre sa raison et sa source.
import { useState, type Dispatch } from 'react';
import type { Suggestion } from '../engine/rules';
import type { BilanAction } from '../state/bilan';
import { fieldDomId } from './dom';

const KIND: Record<Suggestion['kind'], string> = {
  test: 'Test',
  questionnaire: 'Questionnaire',
  redflag: 'Drapeau rouge à vérifier',
};

/** Fait défiler jusqu'au champ ciblé et y place le focus. */
function goTo(target: string) {
  const parts = target.split('.');
  const el =
    document.getElementById(fieldDomId(target)) ??
    document.getElementById(fieldDomId(parts.slice(0, 2).join('.')));
  const details = el?.closest('details');
  if (details) details.open = true;
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  el?.focus({ preventScroll: true });
}

interface Props {
  suggestions: readonly Suggestion[];
  questionnaires: readonly string[];
  dispatch: Dispatch<BilanAction>;
}

export default function SuggestionsPanel({ suggestions, questionnaires, dispatch }: Props) {
  // Sur petit écran, le panneau collant peut être replié pour libérer la saisie.
  const [open, setOpen] = useState(true);
  return (
    <section className={`bilan-sugg${open ? '' : ' folded'}`} aria-label="Suggestions">
      <div className="bilan-sugg-head">
        <h2>Suggestions{suggestions.length ? ` (${suggestions.length})` : ''}</h2>
        <button
          type="button"
          className="linkbtn bilan-fold"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Replier' : 'Déplier'}
        </button>
      </div>
      <div className="bilan-sugg-body">
        {suggestions.length === 0 ? (
          <p className="note">Aucune suggestion pour l’instant.</p>
        ) : (
          <ul>
            {suggestions.map((g) => (
              <li key={g.ruleId} className={`k-${g.kind}`}>
                <p className="eyebrow">{KIND[g.kind]}</p>
                <p className="bilan-sugg-label">{g.label}</p>
                <p className="note">{g.reason}</p>
                {g.source.provisional && <p className="bilan-prov">Source provisoire</p>}
                <div className="row">
                  <button
                    type="button"
                    className="btn small"
                    aria-label={`Ajouter ${g.label}`}
                    onClick={() => {
                      dispatch({ type: 'accept', id: g.ruleId });
                      if (g.kind !== 'questionnaire') goTo(g.target);
                    }}
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    className="btn small ghost"
                    aria-label={`Ignorer ${g.label}`}
                    onClick={() => dispatch({ type: 'dismiss', id: g.ruleId })}
                  >
                    Ignorer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {questionnaires.length > 0 && (
          <>
            <h3 id="bilan-q-title">Questionnaires à proposer</h3>
            <ul aria-labelledby="bilan-q-title" className="bilan-qlist">
              {questionnaires.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p className="note">Le QR code pour le patient arrive dans une prochaine version.</p>
          </>
        )}
      </div>
    </section>
  );
}
