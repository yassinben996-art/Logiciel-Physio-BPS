// Contenu de l'accueil rempli par le patient (spec §5.2). Vouvoiement, langage courant.
// CHOIX DE CONCEPTION : formulations à valider par Yass. Modifier uniquement ce fichier.

export interface ScreeningQuestion {
  id: string;
  /** Question posée au patient. */
  patient: string;
  /** Libellé court pour le bilan et les exports. */
  short: string;
}

export const SCREENING: readonly ScreeningQuestion[] = [
  { id: 'sommeil', patient: 'Votre douleur perturbe-t-elle votre sommeil ?', short: 'sommeil perturbé' },
  {
    id: 'peur',
    patient: 'Avez-vous peur que bouger ou faire du sport aggrave votre problème ?',
    short: 'peur que bouger aggrave',
  },
  {
    id: 'travail',
    patient: 'Ressentez-vous beaucoup de pression au travail ou au quotidien ?',
    short: 'pression au travail ou au quotidien',
  },
  {
    id: 'arret',
    patient: 'Êtes-vous en arrêt de travail à cause de cette douleur ?',
    short: 'arrêt de travail',
  },
  { id: 'isole', patient: 'Vous sentez-vous seul(e) face à ce problème ?', short: 'se sent seul(e)' },
];
export const SCREENING_IDS: ReadonlySet<string> = new Set(SCREENING.map((q) => q.id));
