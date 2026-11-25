// Section Accueil côté physio : statut, lancement du mode patient, « Passer », questions éditables.
import type { Dispatch } from 'react';
import type { IntakeDef, ZoneDef } from '../content/types';
import { LABEL_STATUS, type BilanAction, type BilanState } from '../state/bilan';
import IntakeField from './IntakeField';

interface Props {
  intake: IntakeDef;
  zone: ZoneDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  onStartPatient?: () => void;
}

export default function IntakeSection({ intake, zone, state: s, dispatch, onStartPatient }: Props) {
  const i = s.intake;
  // Une saisie du physio sur un accueil « non fait » le marque « rempli par le physio en séance ».
  const physioDispatch: Dispatch<BilanAction> = (a) => {
    dispatch(a);
    if (i.status === 'none' && (a.type === 'intake' || a.type === 'stroke'))
      dispatch({ type: 'intakeStatus', status: 'physio' });
  };
  const zones = i.answers.zones;
  const missingZone =
    Array.isArray(zones) && zones.length > 0 && !(zones as readonly string[]).includes(zone.id);
  const date =
    i.status === 'patient' && i.patientAt
      ? ` le ${new Date(i.patientAt).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}`
      : '';
  return (
    <div className="intake">
      <div className="intake-head">
        <p className="intake-status">
          Statut : {LABEL_STATUS[i.status]}
          {date}
        </p>
        <div className="row">
          {onStartPatient && (
            <button type="button" className="btn small" onClick={onStartPatient}>
              Accueil patient
            </button>
          )}
          {i.status === 'none' && (
            <button
              type="button"
              className="btn small ghost"
              onClick={() => dispatch({ type: 'intakeStatus', status: 'physio' })}
            >
              Passer l’accueil
            </button>
          )}
        </div>
      </div>
      {missingZone && (
        <p className="note err" role="status">
          Le patient n’a pas coché {zone.label}
        </p>
      )}
      <div className="intake-fields">
        {intake.questions.map((q) => (
          <IntakeField
            key={q.id}
            question={q}
            intake={intake}
            state={s}
            dispatch={physioDispatch}
            audience="physio"
          />
        ))}
      </div>
    </div>
  );
}
