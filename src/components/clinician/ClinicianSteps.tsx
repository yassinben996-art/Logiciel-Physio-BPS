import type { Dispatch, ReactNode } from 'react';
import { DESC, domain } from '../../data/domains';
import { D2, D4, D4B, D5B, D6, SL } from '../../data/items';
import { P_DURATION, P_HEALTH, P_LIFE, P_ONSET, P_REGION } from '../../data/patient';
import { REGION } from '../../data/regions';
import { START_TXT } from '../../data/text';
import { disBand } from '../../engine/analyze';
import type {
  Analysis,
  CaseState,
  CsiType,
  DomainId,
  Duration,
  Item,
  Onset,
  Region,
  StartRisk,
} from '../../engine/types';
import type { Action } from '../../state/reducer';
import { BodyIcon, ChoiceCards, Chips, Scale } from '../inputs';
import { FlagAlert } from '../RedFlags';
import { QResults } from '../QResults';
import { QUESTIONNAIRES } from '@q';
import type { QAnswers } from '../../state/reducer';
import { dstyle } from '../style';
import { Check, LevelTag, NumberField } from '../ui';

interface P {
  c: CaseState;
  X: Analysis;
  dispatch: Dispatch<Action>;
  qa: QAnswers;
}

function Panel({ title, children, aside }: { title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-h">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* 1 — Réponses du patient (modifiables) */
export function PatientAnswers({ c, dispatch: d }: P) {
  const regions: Region[] = ['cervical', 'lumbar', 'shoulder'];
  return (
    <>
      <Panel title="Motif">
        <div className="stack">
          <ChoiceCards
            compact
            name="c-region"
            legend="Zone"
            value={c.region}
            onChange={(r) => d({ type: 'region', region: r })}
            options={regions.map((r) => ({ value: r, label: P_REGION[r], icon: <BodyIcon zone={r} /> }))}
          />
          <div className="grid2">
            <div className="field">
              <label htmlFor="c-label">Repère (initiales)</label>
              <input
                id="c-label"
                type="text"
                maxLength={40}
                autoComplete="off"
                placeholder="Jamais de nom complet"
                value={c.label}
                onChange={(e) => d({ type: 'label', value: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="c-goal">Objectif du patient</label>
              <input
                id="c-goal"
                type="text"
                value={c.goal}
                onChange={(e) => d({ type: 'goal', value: e.target.value })}
              />
            </div>
          </div>
          <ChoiceCards
            compact
            name="c-duration"
            legend="Durée"
            value={c.duration}
            onChange={(v: Duration) => d({ type: 'duration', value: v })}
            options={(Object.keys(P_DURATION) as Duration[]).map((k) => ({ value: k, label: P_DURATION[k] }))}
          />
          <ChoiceCards
            compact
            name="c-onset"
            legend="Début"
            value={c.onset}
            onChange={(v: Onset) => d({ type: 'onset', value: v })}
            options={(Object.keys(P_ONSET) as Onset[]).map((k) => ({ value: k, label: P_ONSET[k] }))}
          />
          <Scale
            compact
            name="c-pain"
            legend="Douleur moyenne"
            lo="aucune"
            hi="maximale"
            value={c.pain}
            onChange={(v) => d({ type: 'num', field: 'pain', value: v })}
          />
        </div>
      </Panel>
      <Panel title="Ressenti" aside={<span className="badge-note">Repères maison, non validés</span>}>
        <div className="grid2 scales">
          {SL.map((s) => (
            <Scale
              compact
              key={s.id}
              name={`c-sl-${s.id}`}
              legend={s.label}
              lo={s.lo}
              hi={s.hi}
              value={c.sl[s.id]}
              onChange={(v) => d({ type: 'slider', id: s.id, value: v })}
            />
          ))}
        </div>
      </Panel>
      <Panel title="Santé, travail et quotidien">
        <div className="stack">
          <Chips
            compact
            legend="Santé"
            items={D4.map((i) => ({ id: i.id, label: P_HEALTH[i.id] ?? i.label }))}
            checked={c.chk}
            onToggle={(id, v) => d({ type: 'check', id, value: v })}
          />
          <Chips
            compact
            legend="Travail et quotidien"
            items={D6.map((i) => ({ id: i.id, label: P_LIFE[i.id] ?? i.label }))}
            checked={c.chk}
            onToggle={(id, v) => d({ type: 'check', id, value: v })}
          />
        </div>
      </Panel>
    </>
  );
}

/* 2 — Sécurité */
export function Safety({ c, X, dispatch: d }: P) {
  const R = REGION[c.region];
  return (
    <Panel title="Drapeaux rouges">
      <p className="lead">
        Un drapeau isolé a une faible valeur prédictive : c’est la combinaison et le contexte qui comptent.
        Leur absence n’exclut pas une pathologie sérieuse.
      </p>
      <div className="grid2">
        {R.flags.map((f) => (
          <Check
            key={f.id}
            id={f.id}
            danger={f.kind === 'u'}
            checked={!!c.chk[f.id]}
            onChange={(v) => d({ type: 'check', id: f.id, value: v })}
            hint={
              <span className={`flagkind ${f.kind}`}>
                {f.kind === 'u' ? 'Orienter sans attendre' : 'Avis médical rapide'}
              </span>
            }
          >
            {f.label}
          </Check>
        ))}
      </div>
      <FlagAlert X={X} />
    </Panel>
  );
}

/* 3 — Questionnaires (scores saisis depuis les versions officielles) */
export function Questionnaires({ c, qa, dispatch: d }: P) {
  const R = REGION[c.region];
  return (
    <>
      <QResults c={c} qa={qa} />
      <Panel title="Scores des questionnaires">
        <p className="lead">
          {QUESTIONNAIRES.length
            ? 'Les scores des questionnaires remplis par le patient sont reportés ici ; tu peux les corriger. Pour les autres, saisis le résultat obtenu sur la version officielle.'
            : 'Utilise les versions officielles (licences) et saisis seulement le résultat. Les questions ne sont pas reproduites ici.'}
        </p>
        <div className="qgrid">
          <div className="qcard">
            <h3>STarT MSK</h3>
            <div className="field">
              <label htmlFor="c-start">Catégorie de risque</label>
              <select
                id="c-start"
                value={c.start}
                onChange={(e) => d({ type: 'start', value: e.target.value as StartRisk })}
              >
                {(Object.keys(START_TXT) as StartRisk[]).map((k) => (
                  <option key={k} value={k}>
                    {START_TXT[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="qcard">
            <h3>Incapacité</h3>
            <div className="field">
              <label htmlFor="c-instr">Questionnaire</label>
              <select
                id="c-instr"
                value={c.instr}
                onChange={(e) => d({ type: 'instr', value: e.target.value })}
              >
                {R.instr.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <NumberField
              id="c-dis"
              label="Score (%)"
              value={c.dis}
              min={0}
              max={100}
              onChange={(v) => d({ type: 'num', field: 'dis', value: v })}
              hint={disBand(c.instr, c.dis)}
            />
          </div>
          <div className="qcard" style={dstyle(2)}>
            <h3>
              <span className="dotc" aria-hidden="true" />
              CSI <small>volet nociplastique</small>
            </h3>
            <div className="field">
              <label htmlFor="c-csitype">Version</label>
              <select
                id="c-csitype"
                value={c.csiType}
                onChange={(e) => d({ type: 'csiType', value: e.target.value as CsiType })}
              >
                <option value="csi9">CSI-9 (seuil 20)</option>
                <option value="csi25">CSI-25 (seuil 40)</option>
              </select>
            </div>
            <NumberField
              id="c-csi"
              label="Score"
              value={c.csi}
              min={0}
              max={c.csiType === 'csi9' ? 36 : 100}
              onChange={(v) => d({ type: 'num', field: 'csi', value: v })}
            />
          </div>
          <div className="qcard" style={dstyle(3)}>
            <h3>
              <span className="dotc" aria-hidden="true" />
              painDETECT <small>volet neuropathique</small>
            </h3>
            <NumberField
              id="c-pd"
              label="Score (−1 à 38)"
              value={c.pd}
              min={-1}
              max={38}
              onChange={(v) => d({ type: 'num', field: 'pd', value: v })}
              hint="< 13 improbable · 13–18 ambigu · ≥ 19 probable"
            />
          </div>
        </div>
      </Panel>
    </>
  );
}

/* 4 — Examen clinique */
function ExamBlock({
  id,
  X,
  items,
  c,
  d,
  extra,
}: {
  id: DomainId;
  X: Analysis;
  items: readonly Item[];
  c: CaseState;
  d: Dispatch<Action>;
  extra?: ReactNode;
}) {
  const a = X.A[id];
  return (
    <section className="exam" style={dstyle(id)}>
      <div className="exam-h">
        <span className="badge" aria-hidden="true">
          {id}
        </span>
        <h3>
          <span className="sr-only">Volet {id} : </span>
          {domain(id).name}
        </h3>
        <LevelTag level={a.level} sub={a.sub} />
      </div>
      <p className="note">{DESC[id]}</p>
      <div className="grid2">
        {items.map((it) => (
          <Check
            key={it.id}
            id={it.id}
            checked={!!c.chk[it.id]}
            onChange={(v) => d({ type: 'check', id: it.id, value: v })}
          >
            {it.label}
          </Check>
        ))}
      </div>
      {extra}
    </section>
  );
}

export function Exam({ c, X, dispatch: d }: P) {
  const R = REGION[c.region];
  return (
    <Panel title="Observations par volet">
      <p className="lead">Le niveau de chaque volet se met à jour à chaque case cochée.</p>
      <div className="stack">
        <ExamBlock id={1} X={X} items={R.d1} c={c} d={d} />
        <ExamBlock id={2} X={X} items={D2} c={c} d={d} />
        <ExamBlock id={3} X={X} items={R.d3} c={c} d={d} />
        <ExamBlock id={4} X={X} items={[D4B]} c={c} d={d} />
        <ExamBlock id={5} X={X} items={D5B} c={c} d={d} />
        <ExamBlock
          id={6}
          X={X}
          items={[]}
          c={c}
          d={d}
          extra={<p className="note">Rempli par le patient (étape 1).</p>}
        />
      </div>
    </Panel>
  );
}
