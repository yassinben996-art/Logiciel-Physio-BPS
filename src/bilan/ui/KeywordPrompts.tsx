// Invites « Tu as noté … : cocher … ? ». Rien n'est coché sans clic du clinicien.
import type { Dispatch } from 'react';
import type { KeywordHit } from '../engine/keywords';
import type { BilanAction } from '../state/bilan';

export default function KeywordPrompts({
  hits,
  dispatch,
}: {
  hits: readonly KeywordHit[];
  dispatch: Dispatch<BilanAction>;
}) {
  if (!hits.length) return null;
  return (
    <ul className="bilan-kw" aria-live="polite">
      {hits.map((h) => (
        <li key={h.key} className={h.possiblyNegated ? 'neg' : undefined}>
          <span>
            Tu as noté « {h.matched} » : cocher {h.label} ?{h.possiblyNegated ? ' (peut-être nié)' : ''}
          </span>
          <button
            type="button"
            className="btn small"
            aria-label={`Cocher ${h.label}`}
            onClick={() => dispatch({ type: 'chip', key: h.key, value: true })}
          >
            Cocher
          </button>
          <button
            type="button"
            className="btn small ghost"
            aria-label={`Non, ne pas cocher ${h.label}`}
            onClick={() => dispatch({ type: 'dismiss', id: `kw:${h.key}` })}
          >
            Non
          </button>
        </li>
      ))}
    </ul>
  );
}
