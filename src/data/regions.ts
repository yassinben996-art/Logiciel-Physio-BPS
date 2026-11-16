// Données portées automatiquement depuis reference/prototype.html (textes inchangés).
import type { Region, RegionDef } from '../engine/types';

export const REGION: Readonly<Record<Region, RegionDef>> = {
  cervical: {
    name: 'Cervicalgie',
    pain: 'la nuque',
    instr: [
      {
        id: 'NDI',
        label: 'NDI',
      },
    ],
    model: 'Nuque : contenu validé par Delphi (Gérard 2025)',
    flags: [
      {
        id: 'x_myel',
        label:
          'Signes de myélopathie ou déficit neurologique qui s’aggrave (maladresse des mains, troubles de la marche)',
        kind: 'u',
      },
      {
        id: 'x_vasc',
        label:
          'Suspicion de dysfonction artérielle cervicale : céphalée brutale inhabituelle, vertiges, diplopie, dysarthrie, dysphagie, drop attacks',
        kind: 'u',
      },
      {
        id: 'x_trauma',
        label: 'Traumatisme majeur récent avec douleur osseuse focale ou déficit neurologique',
        kind: 'u',
      },
      {
        id: 'x_cardiac',
        label: 'Douleur nuque, mâchoire ou bras à l’effort avec sueurs, dyspnée ou douleur thoracique',
        kind: 'u',
      },
      {
        id: 'x_cancer',
        label: 'Antécédent de cancer, perte de poids inexpliquée, douleur nocturne ou de repos constante',
        kind: 'm',
      },
      {
        id: 'x_infect',
        label: 'Fièvre, immunosuppression, infection récente ou drogue intraveineuse',
        kind: 'm',
      },
      {
        id: 'x_inflam',
        label: 'Rhumatisme inflammatoire connu (risque d’instabilité cervicale) ou raideur matinale > 30 min',
        kind: 'm',
      },
      {
        id: 'x_nonmech',
        label: 'Douleur constante, qu’aucune posture ni mouvement ne modifie',
        kind: 'm',
      },
    ],
    d1: [
      {
        id: 'a_mech',
        label: 'La douleur varie avec les mouvements ou les postures de la nuque',
        kind: 'mk',
      },
      {
        id: 'a_local',
        label: 'Douleur axiale ou référée proximale, sans signe radiculaire',
        kind: 'mk',
      },
      {
        id: 'a_dp',
        label: 'Préférence directionnelle ou centralisation à l’examen en mouvements répétés',
        kind: 'dp',
      },
      {
        id: 'a_head',
        label: 'Céphalée associée, déclenchée par le mouvement ou la posture de la nuque',
        kind: 'mk',
      },
      {
        id: 'a_noimp',
        label: 'Pas d’amélioration après 4 à 6 semaines de prise en charge bien conduite',
        kind: 'B',
      },
    ],
    d3: [
      {
        id: 'r_rad',
        label: 'Douleur irradiant au bras en territoire radiculaire',
        kind: 'rad',
      },
      {
        id: 'r_def',
        label: 'Déficit neurologique objectif (force, réflexe ou sensibilité dans un myotome ou dermatome)',
        kind: 'def',
      },
      {
        id: 'r_t1',
        label: 'Test de Spurling positif',
        kind: 'test',
      },
      {
        id: 'r_t2',
        label: 'Distraction cervicale qui soulage',
        kind: 'test',
      },
      {
        id: 'r_t3',
        label: 'Test neurodynamique du membre supérieur (ULNT1) positif',
        kind: 'test',
      },
      {
        id: 'r_t4',
        label: 'Rotation cervicale du côté douloureux < 60°',
        kind: 'test',
      },
      {
        id: 'r_B',
        label: 'Signes de myélopathie : Hoffmann, hyperréflexie, Babinski, clonus, troubles de la marche',
        kind: 'B',
      },
    ],
  },
  lumbar: {
    name: 'Lombalgie',
    pain: 'le dos',
    instr: [
      {
        id: 'ODI',
        label: 'ODI',
      },
      {
        id: 'RMDQ',
        label: 'Roland-Morris (×100/24)',
      },
    ],
    model: 'Lombaires : essais pilotes PDDM (Longtin 2021, 2023)',
    flags: [
      {
        id: 'x_cauda',
        label:
          'Anesthésie en selle, rétention ou incontinence urinaire ou fécale, dysfonction sexuelle récente',
        kind: 'u',
      },
      {
        id: 'x_neuro',
        label: 'Déficit moteur bilatéral ou qui progresse rapidement',
        kind: 'u',
      },
      {
        id: 'x_fract',
        label: 'Traumatisme important, ou ostéoporose / corticoïdes au long cours avec douleur osseuse',
        kind: 'u',
      },
      {
        id: 'x_infect',
        label: 'Fièvre avec douleur intense, drogue intraveineuse, immunosuppression ou infection récente',
        kind: 'u',
      },
      {
        id: 'x_cancer',
        label: 'Antécédent de cancer, perte de poids inexpliquée, douleur nocturne constante',
        kind: 'm',
      },
      {
        id: 'x_axspa',
        label: 'Début avant 40 ans, raideur matinale > 30 min, amélioration à l’exercice',
        kind: 'm',
      },
      {
        id: 'x_age',
        label: 'Première crise après 50 ans avec douleur non mécanique',
        kind: 'm',
      },
    ],
    d1: [
      {
        id: 'a_mech',
        label: 'La douleur varie avec les positions ou mouvements (flexion, extension, charge)',
        kind: 'mk',
      },
      {
        id: 'a_local',
        label: 'Douleur lombaire ± fesse ou cuisse proximale, sans signe radiculaire',
        kind: 'mk',
      },
      {
        id: 'a_dp',
        label: 'Préférence directionnelle ou centralisation',
        kind: 'dp',
      },
      {
        id: 'a_instab',
        label: 'Sensation d’instabilité, accrochage, mouvements aberrants à la reprise de position',
        kind: 'mk',
      },
      {
        id: 'a_noimp',
        label: 'Pas d’amélioration après 4 à 6 semaines de prise en charge bien conduite',
        kind: 'B',
      },
    ],
    d3: [
      {
        id: 'r_rad',
        label: 'Douleur irradiant sous le genou en territoire radiculaire',
        kind: 'rad',
      },
      {
        id: 'r_def',
        label: 'Déficit neurologique objectif (force, réflexe ou sensibilité)',
        kind: 'def',
      },
      {
        id: 'r_t1',
        label: 'Lasègue (SLR) ou slump qui reproduit la douleur',
        kind: 'test',
      },
      {
        id: 'r_t2',
        label: 'SLR croisé positif',
        kind: 'test',
      },
      {
        id: 'r_B',
        label: 'Déficit moteur important (≤ 3/5) ou qui progresse',
        kind: 'B',
      },
    ],
  },
  shoulder: {
    name: 'Épaule douloureuse',
    pain: 'l’épaule',
    instr: [
      {
        id: 'SPADI',
        label: 'SPADI',
      },
      {
        id: 'QuickDASH',
        label: 'QuickDASH',
      },
    ],
    model: 'Épaule : adaptation non validée du modèle',
    flags: [
      {
        id: 'x_trauma',
        label: 'Traumatisme récent avec déformation, impotence totale ou suspicion de fracture ou luxation',
        kind: 'u',
      },
      {
        id: 'x_septic',
        label: 'Épaule chaude, gonflée, avec fièvre (arthrite septique possible)',
        kind: 'u',
      },
      {
        id: 'x_cardiac',
        label: 'Douleur à l’effort avec douleur thoracique, dyspnée ou sueurs',
        kind: 'u',
      },
      {
        id: 'x_tear',
        label: 'Perte brutale de force avec chute du bras après un effort',
        kind: 'm',
      },
      {
        id: 'x_cancer',
        label:
          'Antécédent de cancer, perte de poids inexpliquée, douleur nocturne constante, signe de Horner ou atteinte de la main',
        kind: 'm',
      },
      {
        id: 'x_neuro',
        label:
          'Faiblesse brutale après une douleur intense (névralgie amyotrophiante) ou déficit neurologique progressif',
        kind: 'm',
      },
      {
        id: 'x_visc',
        label:
          'Douleur non mécanique, liée à la respiration, aux repas ou à la posture sans lien avec le mouvement du bras',
        kind: 'm',
      },
    ],
    d1: [
      {
        id: 'a_load',
        label: 'Douleur reproduite par l’élévation ou la charge : arc douloureux, tests résistés douloureux',
        kind: 'mk',
      },
      {
        id: 'a_stiff',
        label: 'Raideur passive globale, surtout en rotation externe (capsulite possible)',
        kind: 'mk',
      },
      {
        id: 'a_instab',
        label: 'Appréhension, sensation d’instabilité ou antécédent de luxation',
        kind: 'mk',
      },
      {
        id: 'a_oa',
        label: 'Arthrose gléno-humérale probable : raideur progressive, crépitements',
        kind: 'mk',
      },
      {
        id: 'a_noimp',
        label: 'Pas d’amélioration après 4 à 6 semaines de prise en charge bien conduite',
        kind: 'B',
      },
    ],
    d3: [
      {
        id: 'r_rad',
        label: 'Douleur référée du cou ou irradiant au bras avec signes radiculaires',
        kind: 'rad',
      },
      {
        id: 'r_def',
        label:
          'Atrophie ou faiblesse du sus- ou infra-épineux, paresthésies inexpliquées (neuropathie périphérique)',
        kind: 'def',
      },
      {
        id: 'r_burn',
        label: 'Douleur dominante de type brûlure, décharges ou fourmillements',
        kind: 'sym',
      },
      {
        id: 'r_B',
        label: 'Déficit neurologique qui progresse',
        kind: 'B',
      },
    ],
  },
};
