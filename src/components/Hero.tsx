import { DOM } from '../data/domains';

/** Emblème décoratif : les six volets du modèle sur leur anneau. */
function Emblem() {
  const R = 64;
  return (
    <svg className="emblem" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">
      <circle r={R} className="emblem-ring" />
      <circle r={R + 22} className="emblem-ring faint" />
      {DOM.map((d, i) => {
        const a = ((-90 + 60 * i) * Math.PI) / 180;
        const x = R * Math.cos(a);
        const y = R * Math.sin(a);
        return (
          <g key={d.id}>
            <line x1={0} y1={0} x2={x} y2={y} className="emblem-spoke" />
            <circle cx={x} cy={y} r={17} style={{ fill: `var(${d.c})` }} />
            <text x={x} y={y + 5} textAnchor="middle" className="emblem-n">
              {d.id}
            </text>
          </g>
        );
      })}
      <circle r={26} className="emblem-hub" />
    </svg>
  );
}

export function Hero({ model }: { model: string }) {
  return (
    <header className="hero">
      <div className="wrap hero-grid">
        <div className="hero-text">
          <p className="eyebrow">Modèle PDDM · nuque, lombaires, épaule</p>
          <h1>Profil des moteurs de douleur</h1>
          <p className="lede">
            Saisis ce que tu observes en consultation. L’outil allume les volets qui entretiennent la douleur
            et le handicap, propose des cibles de traitement chiffrées et classe les interventions selon leur
            niveau de preuve.
          </p>
          <div className="pillrow">
            <span className="pill pill-model">
              <b>{model}</b>
            </span>
            <span className="pill">
              <b>Aide au raisonnement clinique, non validée</b> · ne remplace ni l’examen ni l’avis médical
            </span>
            <span className="pill">
              <b>Aucune donnée enregistrée</b> · tout reste dans cette page
            </span>
          </div>
        </div>
        <Emblem />
      </div>
    </header>
  );
}
