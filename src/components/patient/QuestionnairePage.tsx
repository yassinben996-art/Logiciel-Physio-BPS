import type { Dispatch } from 'react';
import type { QDef, QOption, QPage } from '../../questionnaires/types';
import type { Action, QAnswers } from '../../state/reducer';

/** Pictogrammes des 4 évolutions de la douleur (painDETECT). */
function CourseIcon({ kind }: { kind: NonNullable<QOption['icon']> }) {
  const d = {
    flat: 'M2 22 C10 19 14 21 20 19 S32 21 38 19 S50 21 58 19 V30 H2Z',
    'persistent-attacks': 'M2 24 H14 L17 8 L20 24 H34 L37 12 L40 24 H58 V30 H2Z',
    'attacks-free': 'M2 29 H12 L16 6 L20 29 H34 L39 10 L44 29 H58 V30 H2Z',
    'attacks-pain': 'M2 24 C8 24 10 10 16 10 S24 24 30 24 S36 10 42 10 S52 24 58 24 V30 H2Z',
  }[kind];
  return (
    <svg viewBox="0 0 60 30" className="course-ico" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

const isLikert = (opts: readonly QOption[]) =>
  opts.length <= 7 && opts.every((o) => o.label.length <= 46 && !o.icon);

interface Props {
  q: QDef;
  page: QPage;
  qa: QAnswers;
  dispatch: Dispatch<Action>;
}

export function QuestionnairePage({ q, page, qa, dispatch }: Props) {
  const ans = qa[q.id] ?? {};
  return (
    <div className="stack qpage">
      {page.items.map((it) => {
        const opts = it.options ?? page.options ?? [];
        const name = `q-${q.id}-${it.id}`;
        const likert = isLikert(opts) && opts.length > 2;
        const numeric = likert && opts.every((o) => /^\d+$/.test(o.label));
        return (
          <fieldset key={it.id} className="q">
            <legend className="q-legend">{it.text}</legend>
            <div
              className={
                numeric
                  ? 'likert num'
                  : likert
                    ? 'likert'
                    : opts.some((o) => o.icon)
                      ? 'choices course'
                      : 'choices'
              }
              style={numeric ? ({ '--n': opts.length } as React.CSSProperties) : undefined}
            >
              {opts.map((o, k) => (
                <label key={k} className={likert ? 'lk' : 'choice'}>
                  <input
                    type="radio"
                    name={name}
                    value={k}
                    checked={ans[`${it.id}#`] === k}
                    onChange={() =>
                      dispatch({ type: 'qanswer', q: q.id, item: it.id, value: o.value, index: k })
                    }
                  />
                  {o.icon && <CourseIcon kind={o.icon} />}
                  <span className={likert ? '' : 'choice-label'}>{o.label}</span>
                  {!likert && <span className="choice-tick" aria-hidden="true" />}
                </label>
              ))}
            </div>
            {numeric && page.ends && (
              <div className="scale-ends" aria-hidden="true">
                <span>
                  {opts[0]!.label} · {page.ends[0]}
                </span>
                <span>
                  {page.ends[1]} · {opts[opts.length - 1]!.label}
                </span>
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
