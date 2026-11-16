import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ClinicianLayout } from './components/clinician/ClinicianLayout';
import { PLAN_STEP } from './state/steps';
import { Exam, PatientAnswers, Questionnaires, Safety } from './components/clinician/ClinicianSteps';
import { PatientDone, PatientFlow, Welcome } from './components/patient/PatientFlow';
import { PlanSection } from './components/PlanSection';
import { analyze } from './engine/analyze';
import type { DomainId } from './engine/types';
import { initialState, reducer } from './state/reducer';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [st, dispatch] = useReducer(reducer, undefined, initialState);
  const X = useMemo(() => analyze(st.c), [st.c]);
  const pendingScroll = useRef<DomainId | null>(null);
  const { mode, c: cstep } = st.view;

  const goDomain = useCallback(
    (id: DomainId) => {
      if (st.hideEmpty && X.A[id].level === 0) dispatch({ type: 'hideEmpty', value: false });
      dispatch({ type: 'cstep', n: PLAN_STEP });
      dispatch({ type: 'open', id, value: true });
      pendingScroll.current = id;
    },
    [st.hideEmpty, X],
  );

  // Changement d'étape physio : remonter en haut et placer le focus sur le titre.
  const prevStep = useRef(cstep);
  useEffect(() => {
    if (mode !== 'clinician' || prevStep.current === cstep) return;
    prevStep.current = cstep;
    if (pendingScroll.current !== null) return;
    window.scrollTo?.({ top: 0 });
    document.getElementById('c-title')?.focus({ preventScroll: true });
  }, [mode, cstep]);

  // Après le rendu qui ouvre une branche : défiler jusqu'à elle et y placer le focus.
  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    const el = document.getElementById(`tr-${id}`) as HTMLDetailsElement | null;
    if (!el) return;
    pendingScroll.current = null;
    el.open = true;
    el.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    el.querySelector('summary')?.focus({ preventScroll: true });
  });

  // Impression : déplier toutes les branches, puis restaurer.
  const openRef = useRef(st.open);
  useEffect(() => {
    openRef.current = st.open;
  }, [st.open]);
  useEffect(() => {
    let saved = openRef.current;
    const before = () => {
      saved = openRef.current;
      dispatch({ type: 'openMany', ids: [1, 2, 3, 4, 5, 6], value: true });
    };
    const after = () => dispatch({ type: 'setOpen', open: saved });
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  if (mode === 'welcome') return <Welcome dispatch={dispatch} />;
  if (mode === 'patient') return <PatientFlow st={st} dispatch={dispatch} />;
  if (mode === 'done') return <PatientDone dispatch={dispatch} />;

  const p = { c: st.c, X, dispatch, qa: st.qa, qOff: st.qOff };
  return (
    <ClinicianLayout step={cstep} c={st.c} X={X} dispatch={dispatch} onGo={goDomain}>
      {cstep === 0 && <PatientAnswers {...p} />}
      {cstep === 1 && <Safety {...p} />}
      {cstep === 2 && <Questionnaires {...p} />}
      {cstep === 3 && <Exam {...p} />}
      {cstep >= PLAN_STEP && (
        <PlanSection
          c={st.c}
          X={X}
          qa={st.qa}
          qOff={st.qOff}
          open={st.open}
          hideEmpty={st.hideEmpty}
          dispatch={dispatch}
          onGo={goDomain}
        />
      )}
    </ClinicianLayout>
  );
}
