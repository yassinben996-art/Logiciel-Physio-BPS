export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <p>
          <b>Aide au raisonnement clinique, non validée.</b> Ce n’est ni un dispositif médical ni un outil de
          diagnostic ; il ne remplace ni l’examen clinique ni l’avis médical. <b>Aucune donnée enregistrée</b>{' '}
          : rien n’est stocké ni envoyé, tout disparaît à la fermeture de la page.
        </p>
        <p>
          Adaptation inspirée du modèle Pain and Disability Drivers Management (PDDM / MGVDI). Volet cervical
          : contenu validé par Delphi (Gérard 2025). Volet lombaire : essais pilotes (Longtin 2021, 2023).
          Volet épaule : adaptation non validée. Les règles de calcul sont des choix de conception explicites,
          pas des seuils publiés, sauf mention contraire.
        </p>
      </div>
    </footer>
  );
}
