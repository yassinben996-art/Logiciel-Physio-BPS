// Formulations destinées au patient (vouvoiement, langage courant).
// CHOIX DE CONCEPTION : reformulations des items du prototype, à valider cliniquement.
// Les identifiants sont ceux du moteur : les règles de calcul ne changent pas.
import type { Duration, Onset, Region } from '../engine/types';

export const P_REGION: Readonly<Record<Region, string>> = {
  cervical: 'La nuque',
  lumbar: 'Le bas du dos',
  shoulder: 'L’épaule',
};

export const P_DURATION: Readonly<Record<Duration, string>> = {
  lt6w: 'Moins de 6 semaines',
  '6w3m': 'Entre 6 semaines et 3 mois',
  gt3m: 'Plus de 3 mois',
};

export const P_ONSET: Readonly<Record<Onset, string>> = {
  nontrauma: 'Petit à petit, sans cause précise',
  trauma: 'Après un choc, une chute ou un accident',
  postop: 'Après une opération',
};

/** Volet 4 : problèmes de santé, en langage courant. */
export const P_HEALTH: Readonly<Record<string, string>> = {
  co_diab: 'Diabète',
  co_thy: 'Problème de thyroïde',
  co_lip: 'Cholestérol ou triglycérides élevés',
  co_obes: 'Surpoids',
  co_cv: 'Tension élevée ou maladie du cœur',
  co_mood: 'Dépression ou anxiété diagnostiquée',
  co_sleep: 'Troubles du sommeil, insomnie',
  co_rheum: 'Rhumatisme inflammatoire ou fibromyalgie',
  co_multi: 'Douleurs à au moins trois endroits du corps',
  co_head: 'Migraines ou maux de tête fréquents',
  co_osteo: 'Ostéoporose',
};

/** Volet 6 : travail et quotidien, en langage courant. */
export const P_LIFE: Readonly<Record<string, string>> = {
  e_load: 'Beaucoup de pression au travail, peu de marge de manœuvre',
  e_phys: 'Travail physique : charges, postures longues ou gestes répétés',
  e_supp: 'Peu de soutien au travail ou à la maison',
  e_inact: 'Peu d’activité physique',
  e_smoke: 'Je fume',
  e_sleep: 'Sommeil court ou horaires irréguliers (nuit, équipes)',
  e_sick: 'Arrêt de travail en cours ou répété',
  e_lit: 'Procédure d’assurance ou litige en cours (accident, AI)',
  e_fin: 'Difficultés financières, de logement, ou je m’occupe d’un proche',
  e_iso: 'Je me sens isolé(e)',
};
