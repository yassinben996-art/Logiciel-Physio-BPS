// Écran du bilan clinicien. Tout le contenu (sections, champs, règles) vient de src/bilan/content.
import { Fragment, useEffect, useMemo, useReducer, useRef, useState, type MutableRefObject } from 'react';
import { DISCLAIMER } from '../../data/text';
import { SHOULDER, ZONES } from '../content';
import { detectKeywords } from '../engine/keywords';
import { intakeProgress, sectionProgress } from '../engine/progress';
import { INTAKE } from '../content/intake';
import { evaluate } from '../engine/rules';
import {
  bilanReducer,
  emptyBilan,
  isDirty,
  type BilanAction,
  type BilanState,
  type Identity,
} from '../state/bilan';
import { QUESTIONNAIRES } from '@q';
import HomeQPanel from './HomeQPanel';
import type { HomeQCreate } from '../homeq/create';
import Evolution from './Evolution';
import FollowUp from './FollowUp';
import { previousValue, seriesColumns } from '../engine/evolution';
import BilanExport from './BilanExport';
import FieldInput from './FieldInput';
import IntakeSection from './IntakeSection';
import SectionSummary from './SectionSummary';
import SuggestionsPanel from './SuggestionsPanel';
import AiPanel, { type AiAsk } from './AiPanel';

interface Props {
  initial?: BilanState;
  onChange?: (s: BilanState) => void;
  /** Contenu affiché dans l'en-tête, à droite (ex. état de la sauvegarde, boutons). */
  toolbar?: React.ReactNode;
  /** Si fourni (bilan sauvegardé), « Nouveau bilan » l'appelle sans confirmation : rien n'est perdu. */
  onNew?: () => void;
  /** Si fourni, la section Accueil propose « Accueil patient » (mode patient verrouillé). */
  onStartPatient?: () => void;
  /** Ouvrir l'onglet Accueil dès l'affichage (retour du mode patient). */
  openIntake?: boolean;
  /** Appel à l'IA par le relais (null : synchronisation non active). */
  ai?: AiAsk | null;
  /** Questionnaires à domicile par le relais (null : synchronisation non active). */
  homeQ?: HomeQCreate | null;
  /** Rempli avec le dispatch de cet écran : le parent y injecte des actions (réponses reçues) sans remonter. */
  injectRef?: MutableRefObject<((a: BilanAction) => void) | null>;
  /** Bilans du même patient (celui-ci compris ou non) : rebilan, valeurs d'avant, évolution. */
  series?: readonly BilanState[];
  /** Crée un rebilan de ce patient. */
  onRebilan?: () => void;
}

const ID_FIELDS: readonly { field: keyof Identity; label: string; type: 'text' | 'date' }[] = [
  { field: 'nom', label: 'Nom', type: 'text' },
  { field: 'prenom', label: 'Prénom', type: 'text' },
  { field: 'naissance', label: 'Date de naissance', type: 'date' },
];

export default function BilanApp({
  initial,
  onChange,
  toolbar,
  onNew,
  onStartPatient,
  openIntake,
  ai,
  homeQ,
  injectRef,
  series: allSeries = [],
  onRebilan,
}: Props) {
  const [s, dispatch] = useReducer(bilanReducer, initial, (i) => i ?? emptyBilan('shoulder'));
  const [confirm, setConfirm] = useState(false);
  const zone = ZONES[s.zone] ?? SHOULDER;
  const suggestions = useMemo(() => evaluate(zone, s), [zone, s]);
  // Seulement les bilans du même patient (la série chargée peut encore être celle du bilan affiché avant).
  const series = useMemo(
    () => allSeries.filter((b) => b.patientId === s.patientId),
    [allSeries, s.patientId],
  );
  // Série du patient, avec l'état ouvert à la place de sa version enregistrée.
  // Évolution jusqu'au bilan affiché : les bilans faits après lui n'y entrent pas (ni dans son PDF).
  const columns = useMemo(
    () => seriesColumns([...series.filter((b) => b.id !== s.id && b.createdAt < s.createdAt), s]),
    [series, s],
  );
  // Rang dans la série : 0 pour le premier bilan, 1 pour le rebilan n° 2…
  const rank = series.filter((b) => b.id !== s.id && b.createdAt < s.createdAt).length;
  const prevBilan =
    series.find((b) => b.id === s.previousId) ??
    [...series]
      .filter((b) => b.id !== s.id && b.createdAt < s.createdAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const [showPrev, setShowPrev] = useState(false);
  const hits = useMemo(() => detectKeywords(zone, s), [zone, s]);
  const questionnaires = useMemo(
    () =>
      [
        ...zone.rules
          .filter((r) => r.kind === 'questionnaire' && s.accepted.includes(r.id))
          .map((r) => r.target),
        // Questionnaires ajoutés depuis une suggestion de l'IA.
        ...(s.ai?.items ?? [])
          .filter((i) => i.kind === 'questionnaire' && i.status === 'added' && i.target)
          .map((i) => i.target!),
      ]
        .map((t) => (t === 'psfs' ? 'PSFS' : (QUESTIONNAIRES.find((q) => q.id === t)?.name ?? t)))
        .filter((v, i, a) => a.indexOf(v) === i),
    [zone, s.accepted, s.ai],
  );

  useEffect(() => {
    if (!injectRef) return;
    injectRef.current = dispatch;
    return () => {
      if (injectRef.current === dispatch) injectRef.current = null;
    };
  }, [injectRef]);

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
          <p className="eyebrow">
            {rank > 0 ? `Rebilan n° ${rank + 1}` : 'Bilan'} · {zone.label}
          </p>
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
          <details className="bilan-sec bilan-intake" open={openIntake || undefined}>
            <SectionSummary title="Accueil" {...intakeProgress(INTAKE, s)} />
            <IntakeSection
              intake={INTAKE}
              zone={zone}
              state={s}
              dispatch={dispatch}
              onStartPatient={onStartPatient}
            />
          </details>
          <FollowUp state={s} dispatch={dispatch} onRebilan={onRebilan} />
          {prevBilan && (
            <button
              type="button"
              className="btn small ghost bilan-prev-toggle"
              aria-pressed={showPrev}
              onClick={() => setShowPrev(!showPrev)}
            >
              {showPrev ? 'Masquer le bilan précédent' : 'Afficher le bilan précédent'}
            </button>
          )}
          {zone.sections.map((sec) => (
            <details key={sec.id} className="bilan-sec">
              <SectionSummary title={sec.title} {...sectionProgress(sec, s)} />
              <div className="bilan-fields">
                {sec.fields.map((f) => {
                  const before = showPrev && prevBilan ? previousValue(sec, f, prevBilan) : null;
                  return (
                    <Fragment key={f.id}>
                      <FieldInput section={sec} field={f} state={s} dispatch={dispatch} hits={hits} />
                      {before && <p className="bilan-prev">avant : {before}</p>}
                    </Fragment>
                  );
                })}
              </div>
            </details>
          ))}
          {columns.length > 1 && <Evolution zone={zone} columns={columns} />}
          <HomeQPanel zone={zone} state={s} dispatch={dispatch} suggestions={suggestions} homeQ={homeQ} />
          <BilanExport zone={zone} state={s} series={columns.length > 1 ? columns : []} />
        </main>
        <aside className="bilan-side">
          <SuggestionsPanel
            suggestions={suggestions}
            questionnaires={questionnaires}
            dispatch={dispatch}
            aiPanel={<AiPanel zone={zone} state={s} dispatch={dispatch} ai={ai} />}
          />
        </aside>
      </div>
      <footer className="bilan-foot">
        <p className="note">{DISCLAIMER}</p>
      </footer>
    </div>
  );
}
