// Accueil côté patient : une question par écran, au vouvoiement, sans aucune donnée du bilan.
import { useState, type Dispatch } from 'react';
import type { IntakeDef } from '../content/types';
import { isVisible } from '../engine/intakeText';
import type { BilanAction, BilanState } from '../state/bilan';
import IntakeField from './IntakeField';

interface Props {
  intake: IntakeDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  onDone: () => void;
}

export default function PatientIntake({ intake, state, dispatch, onDone }: Props) {
  const [step, setStep] = useState(0);
  const questions = intake.questions.filter((q) => isVisible(q, state));
  const k = Math.min(step, questions.length - 1);
  const q = questions[k]!;
  const last = k === questions.length - 1;
  return (
    <div className="patient-intake">
      <p className="eyebrow">
        Question {k + 1} sur {questions.length}
      </p>
      <h1 className="patient-q">{q.patient}</h1>
      <IntakeField question={q} intake={intake} state={state} dispatch={dispatch} audience="patient" />
      <p className="note">Vous pouvez passer une question si vous ne savez pas.</p>
      <div className="row patient-nav">
        <button type="button" className="btn ghost" disabled={k === 0} onClick={() => setStep(k - 1)}>
          Précédent
        </button>
        {last ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              dispatch({ type: 'intakeStatus', status: 'patient' });
              onDone();
            }}
          >
            Terminer
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => setStep(k + 1)}>
            Suivant
          </button>
        )}
      </div>
    </div>
  );
}
