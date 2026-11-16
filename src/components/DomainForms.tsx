import { useState, type Dispatch, type ReactNode } from 'react';
import { DESC, domain } from '../data/domains';
import { D2, D4, D4B, D5B, D6, SL } from '../data/items';
import { REGION } from '../data/regions';
import type { Analysis, CaseState, CsiType, DomainId, Item } from '../engine/types';
import type { Action } from '../state/reducer';
import { Check, LevelTag, NumberField } from './ui';
import { dstyle } from './style';

interface Props {
  c: CaseState;
  X: Analysis;
  dispatch: Dispatch<Action>;
}

function Section({
  id,
  X,
  children,
  defaultOpen,
}: {
  id: DomainId;
  X: Analysis;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const a = X.A[id];
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <details
      className="sec"
      style={dstyle(id)}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span className="badge" aria-hidden="true">
          {id}
        </span>
        <span>
          <span className="sr-only">Volet {id} : </span>
          {domain(id).name}
        </span>
        <LevelTag level={a.level} sub={a.sub} />
      </summary>
      <div className="in">
        <p className="note" style={{ margin: '0 0 10px' }}>
          {DESC[id]}
        </p>
        {children}
      </div>
    </details>
  );
}

export function DomainForms({ c, X, dispatch }: Props) {
  const R = REGION[c.region];
  const chk = (it: Item, hint?: ReactNode) => (
    <Check
      key={it.id}
      id={it.id}
      checked={!!c.chk[it.id]}
      hint={hint}
      onChange={(v) => dispatch({ type: 'check', id: it.id, value: v })}
    >
      {it.label}
    </Check>
  );
  return (
    <section className="card" id="s-eval" aria-labelledby="h-eval">
      <h2 id="h-eval">
        <span className="n" aria-hidden="true">
          3
        </span>
        Évaluation en six volets
      </h2>
      <p className="sub">
        Un volet par moteur possible de douleur et d’incapacité. Remplis ce que tu as observé ; le reste reste
        neutre. Le niveau de chaque volet se met à jour en direct.
      </p>

      <Section id={1} X={X} defaultOpen>
        <div className="grid2">{R.d1.map((i) => chk(i))}</div>
      </Section>

      <Section id={2} X={X}>
        <div className="grid2">{D2.map((i) => chk(i))}</div>
        <div className="grid3" style={{ marginTop: 12 }}>
          <div className="f">
            <label htmlFor="f-csitype">Questionnaire CSI utilisé</label>
            <select
              id="f-csitype"
              value={c.csiType}
              onChange={(e) => dispatch({ type: 'csiType', value: e.target.value as CsiType })}
            >
              <option value="csi9">CSI-9 (seuil 20)</option>
              <option value="csi25">CSI-25 (seuil 40)</option>
            </select>
          </div>
          <NumberField
            id="f-csi"
            label="Score CSI"
            value={c.csi}
            min={0}
            max={c.csiType === 'csi9' ? 36 : 100}
            onChange={(v) => dispatch({ type: 'num', field: 'csi', value: v })}
          />
        </div>
        <p className="note">
          Critères inspirés de l’IASP 2021 : durée &gt; 3 mois, distribution régionale, douleur non expliquée
          par la seule lésion, signes d’hypersensibilité. Le CSI est un repère.
        </p>
      </Section>

      <Section id={3} X={X}>
        <div className="grid2">{R.d3.map((i) => chk(i))}</div>
        <div className="grid3" style={{ marginTop: 12 }}>
          <NumberField
            id="f-pd"
            label="Score painDETECT (−1 à 38)"
            value={c.pd}
            min={-1}
            max={38}
            onChange={(v) => dispatch({ type: 'num', field: 'pd', value: v })}
          />
        </div>
        <p className="note">
          painDETECT : moins de 13 improbable, 13 à 18 ambigu, 19 et plus probable (valeurs usuelles du
          questionnaire d’origine).
        </p>
      </Section>

      <Section id={4} X={X}>
        <div className="grid2">{D4.map((i) => chk(i))}</div>
        <div style={{ marginTop: 10 }}>{chk(D4B, 'Sous-volet B : avis médical')}</div>
      </Section>

      <Section id={5} X={X}>
        <h3 className="h4">Questions au patient, de 0 à 10</h3>
        <p className="note" style={{ margin: '0 0 6px' }}>
          <b>Repères maison, non validés</b> : à remplacer par tes questionnaires habituels (FABQ, TSK, PCS,
          PSEQ) si tu les as. Un curseur non touché reste « non renseigné ».
        </p>
        {SL.map((s) => {
          const val = c.sl[s.id];
          const fid = `sl-${s.id}`;
          return (
            <div className="sl" key={s.id}>
              <div className="top">
                <label htmlFor={fid}>{s.label}</label>
                <span className="slv">
                  <b aria-hidden="true">{val === null ? '—' : val}</b>
                  {val !== null && (
                    <button
                      type="button"
                      className="linkbtn"
                      onClick={() => dispatch({ type: 'slider', id: s.id, value: null })}
                      aria-label={`Effacer : ${s.label}`}
                    >
                      effacer
                    </button>
                  )}
                </span>
              </div>
              <input
                type="range"
                id={fid}
                min={0}
                max={10}
                step={1}
                value={val ?? 5}
                data-unset={val === null || undefined}
                aria-valuetext={val === null ? 'non renseigné' : `${val} sur 10`}
                onChange={(e) => dispatch({ type: 'slider', id: s.id, value: Number(e.target.value) })}
                onClick={(e) =>
                  val === null && dispatch({ type: 'slider', id: s.id, value: Number(e.currentTarget.value) })
                }
              />
              <div className="ends" aria-hidden="true">
                <span>{s.lo}</span>
                <span>{s.hi}</span>
              </div>
            </div>
          );
        })}
        <h3 className="h4" style={{ marginTop: 14 }}>
          Comportements observés (sous-volet B)
        </h3>
        <div className="grid2">{D5B.map((i) => chk(i))}</div>
      </Section>

      <Section id={6} X={X}>
        <div className="grid2">
          {D6.map((i) =>
            chk(
              i,
              i.sub === 'B'
                ? 'Sous-volet B : complexe, orientation'
                : 'Sous-volet A : dans le champ du physio',
            ),
          )}
        </div>
      </Section>
    </section>
  );
}
