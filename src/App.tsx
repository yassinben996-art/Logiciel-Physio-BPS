import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { CaseForm } from './components/CaseForm';
import { DomainForms } from './components/DomainForms';
import { ExportBar } from './components/ExportBar';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { LimitsSection } from './components/LimitsSection';
import { PlanSection } from './components/PlanSection';
import { RedFlags } from './components/RedFlags';
import { References } from './components/References';
import { StatusBar } from './components/StatusBar';
import { REGION } from './data/regions';
import { analyze } from './engine/analyze';
import type { DomainId } from './engine/types';
import { initialState, reducer } from './state/reducer';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function App() {
  const [st, dispatch] = useReducer(reducer, undefined, initialState);
  const X = useMemo(() => analyze(st.c), [st.c]);
  const pendingScroll = useRef<DomainId | null>(null);

  const goDomain = useCallback(
    (id: DomainId) => {
      if (st.hideEmpty && X.A[id].level === 0) dispatch({ type: 'hideEmpty', value: false });
      dispatch({ type: 'open', id, value: true });
      pendingScroll.current = id;
    },
    [st.hideEmpty, X],
  );

  // Après le rendu qui ouvre la branche : scroller et déplacer le focus sur son titre.
  useEffect(() => {
    const id = pendingScroll.current;
    if (id === null) return;
    pendingScroll.current = null;
    const el = document.getElementById(`tr-${id}`) as HTMLDetailsElement | null;
    if (!el) return;
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

  return (
    <>
      <a className="skip" href="#s-plan">
        Aller au plan
      </a>
      <Hero model={REGION[st.c.region].model} />
      <StatusBar X={X} onGo={goDomain} />
      <main className="wrap">
        <CaseForm c={st.c} dispatch={dispatch} />
        <RedFlags c={st.c} X={X} dispatch={dispatch} />
        <DomainForms key={st.c.region} c={st.c} X={X} dispatch={dispatch} />
        <PlanSection
          c={st.c}
          X={X}
          open={st.open}
          hideEmpty={st.hideEmpty}
          dispatch={dispatch}
          onGo={goDomain}
        />
        <ExportBar c={st.c} />
        <LimitsSection />
        <References />
      </main>
      <Footer />
    </>
  );
}
