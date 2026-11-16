import type { Dispatch } from 'react';
import { REGION } from '../data/regions';
import type { Analysis, CaseState } from '../engine/types';
import type { Action } from '../state/reducer';
import { Check } from './ui';

export function FlagAlert({ X }: { X: Analysis }) {
  const { u, m } = X.flags;
  if (u.length)
    return (
      <div className="alert danger" role="alert">
        <b>Drapeau rouge à traiter d’abord.</b> {u.map((f) => f.label).join(' ; ')}. Oriente sans attendre ;
        le plan ci-dessous ne s’applique qu’après exclusion d’une cause sérieuse.
        {m.length > 0 && <> Également : {m.map((f) => f.label).join(' ; ')}.</>}
      </div>
    );
  if (m.length)
    return (
      <div className="alert warn" role="status">
        <b>Avis médical rapide conseillé.</b> {m.map((f) => f.label).join(' ; ')}.
      </div>
    );
  return null;
}

export function RedFlags({ c, X, dispatch }: { c: CaseState; X: Analysis; dispatch: Dispatch<Action> }) {
  const R = REGION[c.region];
  return (
    <section className="card" id="s-secu" aria-labelledby="h-secu">
      <h2 id="h-secu">
        <span className="n" aria-hidden="true">
          2
        </span>
        Sécurité d’abord : drapeaux rouges
      </h2>
      <p className="sub">
        Coche ce qui est présent. Un drapeau isolé a une faible valeur prédictive ; c’est la combinaison et le
        contexte qui comptent, et l’absence de drapeau n’exclut pas une pathologie sérieuse.
      </p>
      <div className="grid2">
        {R.flags.map((f) => (
          <Check
            key={f.id}
            id={f.id}
            danger={f.kind === 'u'}
            checked={!!c.chk[f.id]}
            onChange={(v) => dispatch({ type: 'check', id: f.id, value: v })}
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
    </section>
  );
}
