import { useEffect, useRef, type Dispatch, type ReactNode } from 'react';
import { D4, D6, SL } from '../../data/items';
import { P_DURATION, P_HEALTH, P_LIFE, P_ONSET, P_REGION } from '../../data/patient';
import type { CaseState, Duration, Onset, Region } from '../../engine/types';
import { QUESTIONNAIRES } from '@q';
import { appliesTo } from '../../questionnaires/scoring';
import type { Action, AppState } from '../../state/reducer';
import { QuestionnairePage } from './QuestionnairePage';
import { BodyIcon, ChoiceCards, Chips, Scale } from '../inputs';

interface Props {
  st: AppState;
  dispatch: Dispatch<Action>;
}

const REGIONS: Region[] = ['cervical', 'lumbar', 'shoulder'];

interface StepDef {
  title: string;
  eyebrow?: string;
  hint?: string;
  render: (c: CaseState, d: Dispatch<Action>, st: AppState) => ReactNode;
  /** Étape bloquante tant qu'elle n'est pas remplie. */
  ready?: (st: AppState) => boolean;
}

const sliders = (ids: readonly string[]) => (c: CaseState, d: Dispatch<Action>) => (
  <div className="stack">
    {SL.filter((s) => ids.includes(s.id)).map((s) => (
      <Scale
        key={s.id}
        name={`p-sl-${s.id}`}
        legend={s.label}
        lo={s.lo}
        hi={s.hi}
        value={c.sl[s.id]}
        onChange={(v) => d({ type: 'slider', id: s.id, value: v })}
      />
    ))}
  </div>
);

const P_STEPS: readonly StepDef[] = [
  {
    title: 'Où avez-vous mal ?',
    hint: 'Choisissez la zone principale.',
    ready: (st) => st.view.regionChosen,
    render: (c, d, st) => (
      <div className="stack">
        <ChoiceCards
          name="p-region"
          legend={<span className="sr-only">Zone douloureuse</span>}
          value={st.view.regionChosen ? c.region : null}
          onChange={(r) => d({ type: 'region', region: r })}
          options={REGIONS.map((r) => ({ value: r, label: P_REGION[r], icon: <BodyIcon zone={r} /> }))}
        />
        <div className="field narrow">
          <label htmlFor="p-label">Vos initiales (facultatif)</label>
          <input
            id="p-label"
            type="text"
            maxLength={8}
            autoComplete="off"
            value={c.label}
            onChange={(e) => d({ type: 'label', value: e.target.value })}
          />
        </div>
      </div>
    ),
  },
  {
    title: 'Depuis quand ?',
    render: (c, d) => (
      <div className="stack">
        <ChoiceCards
          name="p-duration"
          legend="Depuis combien de temps avez-vous mal ?"
          value={c.duration}
          onChange={(v: Duration) => d({ type: 'duration', value: v })}
          options={(Object.keys(P_DURATION) as Duration[]).map((k) => ({ value: k, label: P_DURATION[k] }))}
        />
        <ChoiceCards
          name="p-onset"
          legend="Comment la douleur a-t-elle commencé ?"
          value={c.onset}
          onChange={(v: Onset) => d({ type: 'onset', value: v })}
          options={(Object.keys(P_ONSET) as Onset[]).map((k) => ({ value: k, label: P_ONSET[k] }))}
        />
      </div>
    ),
  },
  {
    title: 'Votre douleur',
    render: (c, d) => (
      <Scale
        name="p-pain"
        legend="En moyenne, quelle est l’intensité de votre douleur ?"
        lo="Aucune douleur"
        hi="Pire douleur imaginable"
        value={c.pain}
        onChange={(v) => d({ type: 'num', field: 'pain', value: v })}
      />
    ),
  },
  {
    title: 'Ce que vous en pensez',
    hint: 'Il n’y a pas de bonne ou de mauvaise réponse.',
    render: sliders(['exp', 'eff', 'fear']),
  },
  {
    title: 'Comment vous le vivez',
    hint: 'Il n’y a pas de bonne ou de mauvaise réponse.',
    render: sliders(['worry', 'struct', 'dist']),
  },
  {
    title: 'Votre santé',
    hint: 'Touchez tout ce qui vous concerne.',
    render: (c, d) => (
      <Chips
        legend={<span className="sr-only">Problèmes de santé</span>}
        items={D4.map((i) => ({ id: i.id, label: P_HEALTH[i.id] ?? i.label }))}
        checked={c.chk}
        onToggle={(id, v) => d({ type: 'check', id, value: v })}
        noneLabel="Aucun"
      />
    ),
  },
  {
    title: 'Votre travail et votre quotidien',
    hint: 'Touchez tout ce qui vous concerne.',
    render: (c, d) => (
      <Chips
        legend={<span className="sr-only">Travail et quotidien</span>}
        items={D6.map((i) => ({ id: i.id, label: P_LIFE[i.id] ?? i.label }))}
        checked={c.chk}
        onToggle={(id, v) => d({ type: 'check', id, value: v })}
        noneLabel="Rien de tout cela"
      />
    ),
  },
  {
    title: 'Votre objectif',
    hint: 'Qu’aimeriez-vous pouvoir refaire grâce à la physiothérapie ?',
    render: (c, d) => (
      <div className="field">
        <label htmlFor="p-goal" className="sr-only">
          Votre objectif
        </label>
        <textarea
          id="p-goal"
          rows={4}
          placeholder="Par exemple : porter mes enfants, reprendre la course…"
          value={c.goal}
          onChange={(e) => d({ type: 'goal', value: e.target.value })}
        />
      </div>
    ),
  },
];

/** Étapes du parcours : questions de base, puis questionnaires de la région, puis l'objectif. */
function buildSteps(st: AppState): StepDef[] {
  const qs: StepDef[] = QUESTIONNAIRES.filter((q) => !st.qOff[q.id] && appliesTo(q, st.c.region)).flatMap(
    (q) =>
      q.pages.map((page, i) => ({
        title: q.name,
        eyebrow: q.pages.length > 1 ? `Partie ${i + 1} sur ${q.pages.length}` : undefined,
        hint: page.intro,
        render: (_c: CaseState, d: Dispatch<Action>, s: AppState) => (
          <QuestionnairePage q={q} page={page} qa={s.qa} dispatch={d} />
        ),
      })),
  );
  return [...P_STEPS.slice(0, -1), ...qs, P_STEPS[P_STEPS.length - 1]!];
}

export function PatientFlow({ st, dispatch }: Props) {
  const steps = buildSteps(st);
  const n = Math.min(st.view.p, steps.length - 1);
  const step = steps[n]!;
  const last = n >= steps.length - 1;
  const ready = step.ready ? step.ready(st) : true;
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    h.current?.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0 });
  }, [n]);
  const next = () =>
    last ? dispatch({ type: 'mode', mode: 'done' }) : dispatch({ type: 'pstep', n: n + 1 });
  const back = () =>
    n === 0 ? dispatch({ type: 'mode', mode: 'welcome' }) : dispatch({ type: 'pstep', n: n - 1 });
  return (
    <div className="pshell">
      <header className="ptop">
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={n + 1}
          aria-label="Progression"
        >
          <span style={{ width: `${((n + 1) / steps.length) * 100}%` }} />
        </div>
        <span className="pcount">
          {n + 1} / {steps.length}
        </span>
      </header>
      <form
        className="pstep"
        key={n}
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) next();
        }}
      >
        {step.eyebrow && <p className="eyebrow">{step.eyebrow}</p>}
        <h1 ref={h} tabIndex={-1}>
          {step.title}
        </h1>
        {step.hint && <p className="phint">{step.hint}</p>}
        <div className="pbody">{step.render(st.c, dispatch, st)}</div>
        <div className="pnav">
          <button type="button" className="btn ghost" onClick={back}>
            Retour
          </button>
          <button type="submit" className="btn" disabled={!ready}>
            {last ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function Welcome({ dispatch }: { dispatch: Dispatch<Action> }) {
  return (
    <div className="welcome">
      <button type="button" className="to-pro" onClick={() => dispatch({ type: 'mode', mode: 'clinician' })}>
        Espace physiothérapeute
      </button>
      <div className="welcome-in">
        <Mark />
        <h1>Bienvenue</h1>
        <p>Quelques questions avant votre première séance. Comptez environ 10 minutes.</p>
        <button
          type="button"
          className="btn big"
          onClick={() => {
            dispatch({ type: 'pstep', n: 0 });
            dispatch({ type: 'mode', mode: 'patient' });
          }}
        >
          Commencer
        </button>
        <p className="fine">Vos réponses restent sur cet appareil. Rien n’est enregistré ni envoyé.</p>
      </div>
    </div>
  );
}

export function PatientDone({ dispatch }: { dispatch: Dispatch<Action> }) {
  return (
    <div className="welcome">
      <div className="welcome-in">
        <div className="done-mark" aria-hidden="true">
          ✓
        </div>
        <h1>Merci !</h1>
        <p>Vous pouvez rendre l’appareil à votre physiothérapeute.</p>
        <div className="row center">
          <button
            type="button"
            className="btn ghost"
            onClick={() => dispatch({ type: 'mode', mode: 'patient' })}
          >
            Revoir mes réponses
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              dispatch({ type: 'cstep', n: 0 });
              dispatch({ type: 'mode', mode: 'clinician' });
            }}
          >
            Espace physiothérapeute
          </button>
        </div>
      </div>
    </div>
  );
}

/** Marque : six points (les six volets) autour d'un centre. */
export function Mark({ small }: { small?: boolean }) {
  return (
    <svg
      viewBox="-40 -40 80 80"
      className={`mark${small ? ' small' : ''}`}
      aria-hidden="true"
      focusable="false"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => {
        const a = ((-90 + 60 * (i - 1)) * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={26 * Math.cos(a)}
            cy={26 * Math.sin(a)}
            r={7}
            style={{ fill: `var(--c${i})` }}
          />
        );
      })}
      <circle r={11} className="mark-hub" />
    </svg>
  );
}
