// Une question de l'accueil, pour le patient (vouvoiement, grandes cartes) ou pour le physio (compact).
import { useId, type Dispatch, type ReactNode } from 'react';
import { ChoiceCards, Chips, Scale } from '../../components/inputs';
import type { IntakeDef, IntakeQuestion } from '../content/types';
import { formatIntakeValue, isVisible } from '../engine/intakeText';
import type { BilanAction, BilanState, IntakeValue, PsfsItem } from '../state/bilan';
import BodyChart from './BodyChart';

interface Props {
  question: IntakeQuestion;
  intake: IntakeDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  audience: 'patient' | 'physio';
}

const YESNO = [
  { value: 'oui', label: 'Oui' },
  { value: 'non', label: 'Non' },
];

export default function IntakeField({ question: q, intake, state: s, dispatch, audience }: Props) {
  const name = useId();
  if (!isVisible(q, s)) return null;
  const patient = audience === 'patient';
  // Côté patient, la question est déjà le titre de l'écran : la légende reste pour les lecteurs d'écran.
  const label: ReactNode = patient ? <span className="sr-only">{q.patient}</span> : q.clinician;
  const v = s.intake.answers[q.id];
  const set = (value: IntakeValue | null) => dispatch({ type: 'intake', id: q.id, value, by: audience });

  let input: ReactNode;
  switch (q.kind) {
    case 'multi': {
      const list = Array.isArray(v) ? (v as readonly string[]) : [];
      input = (
        <Chips
          compact={!patient}
          legend={label}
          items={q.options.map((o) => ({ id: o.value, label: o.label }))}
          checked={Object.fromEntries(list.map((x) => [x, true]))}
          onToggle={(id, on) => {
            const next = on ? [...list, id] : list.filter((x) => x !== id);
            set(next.length ? next : null);
          }}
        />
      );
      break;
    }
    case 'single':
    case 'yesno':
      input = (
        <ChoiceCards
          compact={!patient}
          name={name}
          legend={label}
          options={q.kind === 'yesno' ? YESNO : q.options}
          value={typeof v === 'string' ? v : null}
          onChange={(x) => set(x)}
        />
      );
      break;
    case 'scale':
      input = (
        <Scale
          compact={!patient}
          name={name}
          legend={label}
          lo={q.lo}
          hi={q.hi}
          value={typeof v === 'number' ? v : null}
          onChange={(x) => set(x)}
        />
      );
      break;
    case 'psfs': {
      const items: PsfsItem[] = Array.from({ length: q.max }, (_, k) => {
        const cur = Array.isArray(v) ? (v as readonly PsfsItem[])[k] : undefined;
        return cur ?? { activity: '', score: null };
      });
      const update = (k: number, patch: Partial<PsfsItem>) => {
        const next = items.map((it, j) => (j === k ? { ...it, ...patch } : it));
        set(next.some((it) => it.activity.trim() !== '' || it.score !== null) ? next : null);
      };
      input = (
        <fieldset className={`q psfs${patient ? '' : ' compact'}`}>
          <legend className="q-legend">{label}</legend>
          {items.map((it, k) => (
            <div key={k} className="psfs-item">
              <div className="f">
                <label htmlFor={`${name}-a${k}`}>Activité {k + 1}</label>
                <input
                  id={`${name}-a${k}`}
                  type="text"
                  autoCapitalize="sentences"
                  value={it.activity}
                  onChange={(e) => update(k, { activity: e.target.value })}
                />
              </div>
              <Scale
                compact
                name={`${name}-s${k}`}
                legend={`Note de l’activité ${k + 1}`}
                lo={q.lo}
                hi={q.hi}
                value={it.score}
                onChange={(x) => update(k, { score: x })}
              />
            </div>
          ))}
        </fieldset>
      );
      break;
    }
    case 'bodychart': {
      const pens = patient ? intake.pens.filter((p) => p.id === intake.patientPen) : intake.pens;
      input = (
        <fieldset className="q bodychart-q">
          <legend className="q-legend">{label}</legend>
          <BodyChart
            strokes={s.intake.strokes}
            pens={pens}
            by={audience}
            onStroke={(stroke) => dispatch({ type: 'stroke', stroke })}
            onErase={patient ? undefined : (index) => dispatch({ type: 'eraseStroke', index })}
            onUndo={patient ? undefined : () => dispatch({ type: 'undoStroke' })}
          />
        </fieldset>
      );
      break;
    }
  }

  // Côté physio : la réponse d'origine du patient reste visible quand elle a été corrigée.
  const orig = s.intake.original[q.id];
  const corrected = !patient && orig !== undefined && JSON.stringify(orig) !== JSON.stringify(v);
  return (
    <div className="intake-field">
      {input}
      {corrected && (
        <p className="note intake-orig">patient : {formatIntakeValue(q, orig) || 'sans réponse'}</p>
      )}
    </div>
  );
}
