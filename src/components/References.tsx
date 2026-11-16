import { REFS } from '../data/refs';

export function References() {
  return (
    <section className="card" id="s-refs" aria-labelledby="h-refs">
      <h2 id="h-refs">
        <span className="n" aria-hidden="true">
          7
        </span>
        Références
      </h2>
      <p className="sub">
        Références consultées via PubMed et Consensus. Les liens ouvrent la notice ou l’article. Seuls les
        titres et résumés ont été lus pour la plupart :{' '}
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
    </section>
  );
}
