/** Étapes de l'espace physio (la dernière est le plan). */
export const C_STEPS = [
  'Réponses du patient',
  'Sécurité',
  'Questionnaires',
  'Examen clinique',
  'Plan de prise en charge',
] as const;
export const PLAN_STEP = C_STEPS.length - 1;
