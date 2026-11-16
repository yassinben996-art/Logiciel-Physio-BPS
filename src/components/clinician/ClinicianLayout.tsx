import { useState, type Dispatch, type ReactNode } from 'react';
import { DOM } from '../../data/domains';
import { LEVELTXT } from '../../data/text';
import type { Analysis, CaseState, DomainId } from '../../engine/types';
import type { Action } from '../../state/reducer';
import { Mark } from '../patient/PatientFlow';
import { dstyle } from '../style';
import { C_STEPS, PLAN_STEP } from '../../state/steps';

interface Props {
  step: number;
  c: CaseState;
  X: Analysis;
  dispatch: Dispatch<Action>;
  onGo: (id: DomainId) => void;
  children: ReactNode;
}

export function ClinicianLayout({ step, c, X, dispatch, onGo, children }: Props) {
  const [confirm, setConfirm] = useState(false);
  const flags = X.flags.u.length + X.flags.m.length;
  return (
    <div className="cshell">
      <aside className="side">
        <div className="brand">
          <Mark small />
          <div>
            <b>Profil des moteurs de douleur</b>
            <span>{c.label ? `Patient ${c.label}` : 'Nouveau patient'}</span>
          </div>
        </div>
        <nav aria-label="Étapes">
          <ol className="steps">
            {C_STEPS.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  aria-label={i === 1 && flags > 0 ? `${s}, ${flags} drapeau(x) rouge(s)` : s}
                  aria-current={i === step ? 'step' : undefined}
                  className={i === step ? 'on' : i < step ? 'past' : ''}
                  onClick={() => dispatch({ type: 'cstep', n: i })}
                >
                  <span className="sn" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="st">{s}</span>
                  {i === 1 && flags > 0 && <span className="flagdot" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="side-vol">
          <p className="side-lbl">Volets</p>
          <ul>
            {DOM.map((d) => {
              const l = X.A[d.id].level;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`vol l${l}`}
                    style={dstyle(d.id)}
                    onClick={() => onGo(d.id)}
                    aria-label={`${d.name} : ${LEVELTXT[l]}`}
                  >
                    <i aria-hidden="true">{d.id}</i>
                    <span aria-hidden="true">{d.short}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="side-foot">
          {confirm ? (
            <div className="confirm" role="group" aria-label="Confirmer">
              <span>Effacer toutes les réponses ?</span>
              <button
                type="button"
                className="btn small danger"
                onClick={() => dispatch({ type: 'newPatient' })}
              >
                Effacer
              </button>
              <button type="button" className="btn small ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost small" onClick={() => setConfirm(true)}>
              Nouveau patient
            </button>
          )}
        </div>
      </aside>
      <main className="cmain">
        <header className="chead">
          <p className="eyebrow">
            Étape {step + 1} sur {C_STEPS.length}
          </p>
          <h1 tabIndex={-1} id="c-title">
            {C_STEPS[step]}
          </h1>
        </header>
        {children}
        <div className="cnav">
          {step > 0 ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => dispatch({ type: 'cstep', n: step - 1 })}
            >
              ← {C_STEPS[step - 1]}
            </button>
          ) : (
            <span />
          )}
          {step < PLAN_STEP && (
            <button type="button" className="btn" onClick={() => dispatch({ type: 'cstep', n: step + 1 })}>
              {C_STEPS[step + 1]} →
            </button>
          )}
        </div>
        <footer className="cfoot">
          Aide au raisonnement clinique, non validée. Ne remplace ni l’examen clinique ni l’avis médical.
          Aucune donnée enregistrée.
        </footer>
      </main>
    </div>
  );
}
