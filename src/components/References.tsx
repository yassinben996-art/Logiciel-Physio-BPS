import { REFS } from '../data/refs';

export function References() {
  return (
    <>
      <p className="note">
        Références consultées via PubMed et Consensus, lues sur titres et résumés pour la plupart :{' '}
        <b>à vérifier dans les textes complets avant usage clinique</b>.
      </p>
      <ol className="refs">
        {REFS.map((r) => (
          <li key={r.key} id={`ref-${r.key}`} tabIndex={-1}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            ) : (
              r.title
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
