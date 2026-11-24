// Rendu d'un champ de contenu (FieldDef). Aucun libellé clinique ici : tout vient du contenu.
import type { Dispatch } from 'react';
import { Chips } from '../../components/inputs';
import { NumberField } from '../../components/ui';
import type { FieldDef, SectionDef } from '../content/types';
import type { BilanAction, BilanState, TestResult } from '../state/bilan';
import type { KeywordHit } from '../engine/keywords';
import { fieldDomId } from './dom';
import KeywordPrompts from './KeywordPrompts';

interface Props {
  section: SectionDef;
  field: FieldDef;
  state: BilanState;
  dispatch: Dispatch<BilanAction>;
  hits: readonly KeywordHit[];
}

const TEST_OPTIONS: readonly { value: TestResult | null; label: string }[] = [
  { value: 'pos', label: 'positif' },
  { value: 'neg', label: 'négatif' },
  { value: null, label: 'non fait' },
];

export default function FieldInput({ section, field: f, state: s, dispatch, hits }: Props) {
  const key = `${section.id}.${f.id}`;
  const domId = fieldDomId(key);
  switch (f.kind) {
    case 'number': {
      const one = (k: string, side?: 'D' | 'G') => (
        <NumberField
          key={k}
          id={fieldDomId(k)}
          label={
            side ? (
              <>
                <span className="sr-only">{f.label} </span>
                {side}
              </>
            ) : (
              f.label
            )
          }
          value={s.nums[k] ?? null}
          min={f.min}
          max={f.max}
          step={0.5}
          inputMode="decimal"
          hint={f.unit}
          onChange={(v) => dispatch({ type: 'num', key: k, value: v, min: f.min, max: f.max })}
        />
      );
      if (!f.sided) return <div id={domId}>{one(key)}</div>;
      return (
        <fieldset id={domId} className="bilan-num" tabIndex={-1}>
          <legend>
            {f.label}
            {f.unit ? ` (${f.unit})` : ''}
          </legend>
          <div className="bilan-sides">
            {one(`${key}.D`, 'D')}
            {one(`${key}.G`, 'G')}
          </div>
        </fieldset>
      );
    }
    case 'choice':
      return (
        <fieldset id={domId} className="bilan-test" tabIndex={-1}>
          <legend>{f.label}</legend>
          <div className="bilan-radios">
            {[...f.options, { value: '', label: 'non renseigné' }].map((o) => (
              <label key={o.value} className="chip">
                <input
                  type="radio"
                  name={domId}
                  checked={(s.choices[key] ?? '') === o.value}
                  onChange={() => dispatch({ type: 'choice', key, value: o.value || null })}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case 'test':
      return (
        <fieldset id={domId} className="bilan-test" tabIndex={-1}>
          <legend>{f.label}</legend>
          <div className="bilan-radios">
            {TEST_OPTIONS.map((o) => (
              <label key={o.label} className="chip">
                <input
                  type="radio"
                  name={domId}
                  checked={(s.tests[key] ?? null) === o.value}
                  onChange={() => dispatch({ type: 'test', key, value: o.value })}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    case 'chips':
      return (
        <div
          id={domId}
          tabIndex={-1}
          className={f.chips.some((c) => c.redFlag) ? 'bilan-chips red' : 'bilan-chips'}
        >
          <Chips
            compact
            legend={f.label}
            items={f.chips}
            checked={Object.fromEntries(f.chips.map((c) => [c.id, !!s.chips[`${key}.${c.id}`]]))}
            onToggle={(id, v) => dispatch({ type: 'chip', key: `${key}.${id}`, value: v })}
          />
        </div>
      );
    case 'notes':
      return (
        <div className="bilan-notes">
          <label htmlFor={domId}>{f.label}</label>
          <textarea
            id={domId}
            aria-label={`Notes (${section.title})`}
            autoCapitalize="sentences"
            rows={3}
            value={s.notes[key] ?? ''}
            onChange={(e) => dispatch({ type: 'note', key, value: e.target.value })}
          />
          <KeywordPrompts hits={hits.filter((h) => h.note === key)} dispatch={dispatch} />
        </div>
      );
  }
}
