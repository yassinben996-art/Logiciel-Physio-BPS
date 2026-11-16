import type { Analysis } from '../engine/types';

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
