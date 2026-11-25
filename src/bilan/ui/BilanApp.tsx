// Écran du bilan clinicien. Tout le contenu (sections, champs, règles) vient de src/bilan/content.
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DISCLAIMER } from '../../data/text';
import { SHOULDER, ZONES } from '../content';
import { detectKeywords } from '../engine/keywords';
import { sectionProgress } from '../engine/progress';
import { evaluate } from '../engine/rules';
import { bilanReducer, emptyBilan, isDirty, type BilanState, type Identity } from '../state/bilan';
import { QUESTIONNAIRES } from '@q';
import BilanExport from './BilanExport';
import FieldInput from './FieldInput';
import SectionSummary from './SectionSummary';
import SuggestionsPanel from './SuggestionsPanel';

interface Props {
  initial?: BilanState;
  onChange?: (s: BilanState) => void;
  /** Contenu affiché dans l'en-tête, à droite (ex. état de la sauvegarde, boutons). */
  toolbar?: React.ReactNode;
  /** Si fourni (bilan sauvegardé), « Nouveau bilan » l'appelle sans confirmation : rien n'est perdu. */
  onNew?: () => void;
}

const ID_FIELDS: readonly { field: keyof Identity; label: string; type: 'text' | 'date' }[] = [
  { field: 'nom', label: 'Nom', type: 'text' },
  { field: 'prenom', label: 'Prénom', type: 'text' },
  { field: 'naissance', label: 'Date de naissance', type: 'date' },
];

export default function BilanApp({ initial, onChange, toolbar, onNew }: Props) {
  const [s, dispatch] = useReducer(bilanReducer, initial, (i) => i ?? emptyBilan('shoulder'));
  const [confirm, setConfirm] = useState(false);
  const zone = ZONES[s.zone] ?? SHOULDER;
  const suggestions = useMemo(() => evaluate(zone, s), [zone, s]);
  const hits = useMemo(() => detectKeywords(zone, s), [zone, s]);
  const questionnaires = useMemo(
    () =>
      zone.rules
        .filter((r) => r.kind === 'questionnaire' && s.accepted.includes(r.id))
        .map((r) =>
          r.target === 'psfs' ? 'PSFS' : (QUESTIONNAIRES.find((q) => q.id === r.target)?.name ?? r.target),
        )
        .filter((v, i, a) => a.indexOf(v) === i),
    [zone, s.accepted],
  );

  // Notifie le parent à chaque changement (pas au premier rendu).
  const first = useRef(s);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    if (s !== first.current) cb.current?.(s);
  }, [s]);

  // Sans sauvegarde branchée, prévenir avant de quitter une saisie en cours.
  const dirty = isDirty(s);
  useEffect(() => {
    if (onChange || !dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty, onChange]);

  return (
    <div className="bilan bilan-theme">
      <header className="bilan-head">
        <div className="bilan-title">
          <p className="eyebrow">Bilan · {zone.label}</p>
          <p className="bilan-code">{s.code}</p>
        </div>
        <div className="bilan-id">
          {ID_FIELDS.map((f) => (
            <div className="f" key={f.field}>
              <label htmlFor={`bid-${f.field}`}>{f.label}</label>
              <input
                id={`bid-${f.field}`}
                type={f.type}
                autoComplete="off"
                value={s.identity[f.field]}
                onChange={(e) => dispatch({ type: 'identity', field: f.field, value: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="bilan-tools">
          {toolbar}
          {onNew ? (
            <button type="button" className="btn ghost small" onClick={onNew}>
              Nouveau bilan
            </button>
          ) : confirm ? (
            <div className="confirm" role="group" aria-label="Confirmer">
              <span>Effacer ce bilan et en commencer un nouveau ?</span>
              <button
                type="button"
                className="btn small danger"
                onClick={() => {
                  dispatch({ type: 'reset' });
                  setConfirm(false);
                }}
              >
                Effacer
              </button>
              <button type="button" className="btn small ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirm(true)}>
              Nouveau bilan
            </button>
          )}
        </div>
      </header>
      <div className="bilan-layout">
        <main className="bilan-main">
          {zone.sections.map((sec) => (
            <details key={sec.id} className="bilan-sec">
              <SectionSummary title={sec.title} {...sectionProgress(sec, s)} />
              <div className="bilan-fields">
                {sec.fields.map((f) => (
                  <FieldInput key={f.id} section={sec} field={f} state={s} dispatch={dispatch} hits={hits} />
                ))}
              </div>
            </details>
          ))}
          <BilanExport zone={zone} state={s} />
        </main>
        <aside className="bilan-side">
          <SuggestionsPanel suggestions={suggestions} questionnaires={questionnaires} dispatch={dispatch} />
        </aside>
      </div>
      <footer className="bilan-foot">
        <p className="note">{DISCLAIMER}</p>
      </footer>
    </div>
  );
}
