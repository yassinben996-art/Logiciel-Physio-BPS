// Données portées automatiquement depuis reference/prototype.html (textes inchangés).
import type { Item, SliderDef, EnvItem } from '../engine/types';

/** Volet 2 : critères nociplastiques. */
export const D2: readonly Item[] = [
  {
    id: 'n_reg',
    label: 'Distribution régionale étendue, multifocale ou diffuse (pas un territoire anatomique discret)',
  },
  {
    id: 'n_disp',
    label: 'Douleur ou irritabilité disproportionnée par rapport à la lésion ou à la charge',
  },
  {
    id: 'n_all',
    label: 'Hypersensibilité à l’examen : allodynie, hyperalgésie, sensation résiduelle après stimulation',
  },
  {
    id: 'n_sens',
    label: 'Hypersensibilité sensorielle rapportée : toucher, lumière, bruit, odeurs, froid ou chaud',
  },
];

/** Volet 4 : comorbidités. */
export const D4: readonly Item[] = [
  {
    id: 'co_diab',
    label: 'Diabète',
  },
  {
    id: 'co_thy',
    label: 'Maladie thyroïdienne',
  },
  {
    id: 'co_lip',
    label: 'Dyslipidémie',
  },
  {
    id: 'co_obes',
    label: 'Surpoids ou obésité',
  },
  {
    id: 'co_cv',
    label: 'Hypertension ou maladie cardiovasculaire',
  },
  {
    id: 'co_mood',
    label: 'Dépression ou anxiété diagnostiquée',
  },
  {
    id: 'co_sleep',
    label: 'Troubles du sommeil, insomnie',
  },
  {
    id: 'co_rheum',
    label: 'Rhumatisme inflammatoire ou fibromyalgie',
  },
  {
    id: 'co_multi',
    label: 'Douleur multisite (trois régions ou plus)',
  },
  {
    id: 'co_head',
    label: 'Migraine ou céphalées fréquentes',
  },
  {
    id: 'co_osteo',
    label: 'Ostéoporose',
  },
];

/** Volet 4 : comorbidité mal contrôlée (sous-volet B). */
export const D4B: Item = {
  id: 'co_unc',
  label: 'Au moins une comorbidité mal contrôlée ou qui demande un avis médical',
};

/** Volet 5 : repères maison 0–10, non validés. */
export const SL: readonly SliderDef[] = [
  {
    id: 'exp',
    label: 'Je pense que je vais guérir ou beaucoup m’améliorer',
    lo: 'Pas du tout',
    hi: 'Tout à fait',
  },
  {
    id: 'eff',
    label: 'Je me sens capable d’agir moi-même sur ma douleur',
    lo: 'Pas du tout',
    hi: 'Tout à fait',
  },
  {
    id: 'fear',
    label: 'J’ai peur que bouger aggrave le problème',
    lo: 'Pas du tout',
    hi: 'Énormément',
  },
  {
    id: 'worry',
    label: 'Je m’inquiète beaucoup de ce que ça signifie',
    lo: 'Pas du tout',
    hi: 'Énormément',
  },
  {
    id: 'struct',
    label: 'Je pense que cette région est abîmée ou fragile',
    lo: 'Pas du tout',
    hi: 'Tout à fait',
  },
  {
    id: 'dist',
    label: 'Je me sens tendu(e), triste ou anxieux(se) à cause de la douleur',
    lo: 'Pas du tout',
    hi: 'Énormément',
  },
];

/** Volet 5 : comportements observés (sous-volet B). */
export const D5B: readonly Item[] = [
  {
    id: 'b_avoid',
    label: 'Évitement de mouvements ou d’activités par peur de la douleur',
  },
  {
    id: 'b_persist',
    label: 'Persistance malgré la douleur : suractivité suivie de poussées',
  },
  {
    id: 'b_safety',
    label: 'Recherche de sécurité : collier, repos prolongé, ménagement protecteur, vérifications répétées',
  },
  {
    id: 'b_comm',
    label: 'Communication de la douleur très démonstrative ou catastrophique (« 15 sur 10 »)',
  },
];

/** Volet 6 : environnement, mode de vie (A = champ du physio, B = orientation). */
export const D6: readonly EnvItem[] = [
  {
    id: 'e_load',
    label: 'Charge de travail élevée, peu de marge de manœuvre',
    sub: 'A',
  },
  {
    id: 'e_phys',
    label: 'Travail physiquement lourd, postures prolongées ou gestes répétés',
    sub: 'A',
  },
  {
    id: 'e_supp',
    label: 'Peu de soutien au travail ou à la maison',
    sub: 'A',
  },
  {
    id: 'e_inact',
    label: 'Peu d’activité physique, sédentarité',
    sub: 'A',
  },
  {
    id: 'e_smoke',
    label: 'Tabagisme',
    sub: 'A',
  },
  {
    id: 'e_sleep',
    label: 'Sommeil court ou irrégulier (horaires, travail posté)',
    sub: 'A',
  },
  {
    id: 'e_sick',
    label: 'Arrêt de travail en cours ou récidivant',
    sub: 'B',
  },
  {
    id: 'e_lit',
    label: 'Litige ou procédure d’assurance (accident, AI)',
    sub: 'B',
  },
  {
    id: 'e_fin',
    label: 'Difficultés financières, logement précaire, charge de proche aidant',
    sub: 'B',
  },
  {
    id: 'e_iso',
    label: 'Isolement social',
    sub: 'B',
  },
];
