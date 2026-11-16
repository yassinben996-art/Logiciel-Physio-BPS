import type { Dispatch } from 'react';
import { EX } from '../data/examples';
import { REGION } from '../data/regions';
import { DURATION_TXT, ONSET_TXT, START_TXT } from '../data/text';
import { disBand } from '../engine/analyze';
import type { CaseState, Duration, Onset, Region, StartRisk } from '../engine/types';
import type { Action } from '../state/reducer';
import { NumberField } from './ui';

const REGION_BTN: Record<Region, string> = { cervical: 'Nuque', lumbar: 'Lombaires', shoulder: 'Épaule' };

export function CaseForm({ c, dispatch }: { c: CaseState; dispatch: Dispatch<Action> }) {
  const R = REGION[c.region];
  return (
    <section className="card" id="s-cas" aria-labelledby="h-cas">
      <h2 id="h-cas">
        <span className="n" aria-hidden="true">
          1
        </span>
        Le cas
      </h2>
      <p className="sub">Choisis la région ou charge un cas fictif pour voir l’outil fonctionner.</p>
      <div className="seg" role="group" aria-label="Région">
        {(Object.keys(REGION_BTN) as Region[]).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={c.region === r}
            onClick={() => dispatch({ type: 'region', region: r })}
          >
            {REGION_BTN[r]}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <span className="note" style={{ margin: 0 }}>
          Charger un exemple (cas fictif) :
        </span>
        {(Object.keys(EX) as Region[]).map((r) => (
          <button
            key={r}
            type="button"
            className="btn ghost"
            onClick={() => dispatch({ type: 'example', region: r })}
          >
            {EX[r].button}
          </button>
        ))}
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'reset' })}>
          Réinitialiser
        </button>
      </div>

      <div className="grid3" style={{ marginTop: 14 }}>
        <div className="f">
          <label htmlFor="f-label">Repère du patient</label>
          <input
            id="f-label"
            type="text"
            maxLength={40}
            autoComplete="off"
            placeholder="Initiales uniquement, ex. M.B. (jamais de nom complet)"
            value={c.label}
            onChange={(e) => dispatch({ type: 'label', value: e.target.value })}
          />
        </div>
        <div className="f">
          <label htmlFor="f-duration">Durée des symptômes</label>
          <select
            id="f-duration"
            value={c.duration}
            onChange={(e) => dispatch({ type: 'duration', value: e.target.value as Duration })}
          >
            {(Object.keys(DURATION_TXT) as Duration[]).map((k) => (
              <option key={k} value={k}>
                {DURATION_TXT[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor="f-onset">Début</label>
          <select
            id="f-onset"
            value={c.onset}
            onChange={(e) => dispatch({ type: 'onset', value: e.target.value as Onset })}
          >
            {(Object.keys(ONSET_TXT) as Onset[]).map((k) => (
              <option key={k} value={k}>
                {ONSET_TXT[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid3" style={{ marginTop: 12 }}>
        <div className="f">
          <label htmlFor="f-start">Risque STarT MSK (outil officiel)</label>
          <select
            id="f-start"
            value={c.start}
            onChange={(e) => dispatch({ type: 'start', value: e.target.value as StartRisk })}
          >
            {(Object.keys(START_TXT) as StartRisk[]).map((k) => (
              <option key={k} value={k}>
                {START_TXT[k]}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          id="f-pain"
          label="Douleur moyenne (0–10)"
          value={c.pain}
          min={0}
          max={10}
          step={0.5}
          onChange={(v) => dispatch({ type: 'num', field: 'pain', value: v })}
        />
        <div className="f">
          <label htmlFor="f-instr">Instrument d’incapacité</label>
          <div className="row nowrap">
            <select
              id="f-instr"
              value={c.instr}
              onChange={(e) => dispatch({ type: 'instr', value: e.target.value })}
            >
              {R.instr.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="grid3" style={{ marginTop: 12 }}>
        <NumberField
          id="f-dis"
          label={`Score d’incapacité ${c.instr} (en %)`}
          value={c.dis}
          min={0}
          max={100}
          onChange={(v) => dispatch({ type: 'num', field: 'dis', value: v })}
          hint={disBand(c.instr, c.dis)}
        />
        <div className="f span2">
          <label htmlFor="f-goal">Objectif du patient (repris dans les cibles)</label>
          <textarea
            id="f-goal"
            placeholder="Ex. : porter mon fils sans douleur, reprendre la natation, finir ma journée sans arrêt…"
            value={c.goal}
            onChange={(e) => dispatch({ type: 'goal', value: e.target.value })}
          />
        </div>
      </div>
      <p className="note">
        STarT MSK : tu saisis la catégorie obtenue avec l’outil officiel de Keele (10 items, 3 niveaux de
        risque). Les items ne sont pas reproduits ici. Même principe pour les questionnaires d’incapacité :
        seul le score est saisi.
      </p>
    </section>
  );
}
