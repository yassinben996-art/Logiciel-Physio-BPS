// Données portées automatiquement depuis reference/prototype.html (textes inchangés).
import type { DomainDef, DomainId } from '../engine/types';

export const DOMAIN_IDS: readonly DomainId[] = [1, 2, 3, 4, 5, 6];

export const DOM: readonly DomainDef[] = [
  {
    id: 1,
    name: 'Nociceptif',
    short: 'Nociceptif',
    c: '--c1',
    t: '--t1',
  },
  {
    id: 2,
    name: 'Nociplastique',
    short: 'Nociplastique',
    c: '--c2',
    t: '--t2',
  },
  {
    id: 3,
    name: 'Neuropathique',
    short: 'Neuropathique',
    c: '--c3',
    t: '--t3',
  },
  {
    id: 4,
    name: 'Comorbidités',
    short: 'Comorbidités',
    c: '--c4',
    t: '--t4',
  },
  {
    id: 5,
    name: 'Cognitivo-affectif',
    short: 'Cognitivo-affectif',
    c: '--c5',
    t: '--t5',
  },
  {
    id: 6,
    name: 'Environnement et mode de vie',
    short: 'Environnement',
    c: '--c6',
    t: '--t6',
  },
];

export const DESC: Readonly<Record<DomainId, string>> = {
  '1': 'Douleur liée aux tissus et à la charge : elle varie avec le mouvement, la posture ou l’effort.',
  '2': 'Douleur entretenue par une sensibilité accrue du système nerveux (sensibilisation centrale). Dépistage, pas diagnostic.',
  '3': 'Douleur liée à une lésion ou maladie du système somatosensoriel : racine, nerf périphérique, moelle.',
  '4': 'Maladies et états associés qui modifient le pronostic ou limitent le traitement.',
  '5': 'Croyances, émotions (volet A) et comportements (volet B) face à la douleur : évitement, persistance, recherche de sécurité.',
  '6': 'Travail, activité physique, sommeil, soutien et besoins sociaux qui entretiennent ou freinent la récupération.',
};

export const domain = (id: DomainId): DomainDef => DOM[id - 1]!;
