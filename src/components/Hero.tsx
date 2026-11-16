export function Hero({ model }: { model: string }) {
  return (
    <header className="hero">
      <div className="wrap">
        <h1>Profil des moteurs de douleur</h1>
        <p>
          Saisis ce que tu observes en consultation (nuque, lombaires ou épaule). L’outil allume les volets
          qui entretiennent la douleur et le handicap, propose des cibles de traitement et classe les
          interventions selon leur niveau de preuve.
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
    </header>
  );
}
