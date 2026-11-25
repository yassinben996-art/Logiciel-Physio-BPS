// Contenu PROVISOIRE de l'accueil patient (spec accueil §5.3), à valider par Yass.
// Ajouter, retirer ou réordonner une question ou un crayon : modifier uniquement ce fichier.
import { SL } from '../../data/items';
import { P_DURATION, P_ONSET, P_REGION } from '../../data/patient';
import type { IntakeDef, IntakeOption, IntakeQuestion, Source } from './types';

const P: Source = {
  ref: 'provisoire — à valider par Yass (spec accueil §5.3)',
  added: '2026-11-25',
  provisional: true,
};
const PDDM: Source = {
  ref: 'repères maison du PDDM (src/data/items.ts), non validés',
  added: '2026-11-25',
  provisional: true,
};

const opts = (r: Readonly<Record<string, string>>): IntakeOption[] =>
  Object.entries(r).map(([value, label]) => ({ value, label }));

const slider = (id: 'exp' | 'fear' | 'worry'): IntakeQuestion => {
  const s = SL.find((x) => x.id === id)!;
  return { kind: 'scale', id, patient: s.label, clinician: s.label, lo: s.lo, hi: s.hi, source: PDDM };
};

export const INTAKE: IntakeDef = {
  questions: [
    {
      kind: 'multi',
      id: 'zones',
      patient: 'Où avez-vous mal ?',
      clinician: 'Zones douloureuses',
      options: opts(P_REGION),
      source: P,
    },
    {
      kind: 'single',
      id: 'cote',
      patient: 'Quelle épaule ?',
      clinician: 'Côté',
      options: [
        { value: 'droite', label: 'Droite' },
        { value: 'gauche', label: 'Gauche' },
        { value: 'deux', label: 'Les deux' },
      ],
      showIf: { id: 'zones', includes: 'shoulder' },
      source: P,
    },
    {
      kind: 'single',
      id: 'duree',
      patient: 'Depuis combien de temps avez-vous mal ?',
      clinician: 'Durée',
      options: opts(P_DURATION),
      source: P,
    },
    {
      kind: 'single',
      id: 'debut',
      patient: 'Comment la douleur a-t-elle commencé ?',
      clinician: 'Début',
      options: opts(P_ONSET),
      source: P,
    },
    {
      kind: 'scale',
      id: 'douleur',
      patient: 'En moyenne, quelle est l’intensité de votre douleur ?',
      clinician: 'Douleur moyenne (0–10)',
      lo: 'Pas de douleur',
      hi: 'Pire douleur imaginable',
      source: P,
    },
    {
      kind: 'bodychart',
      id: 'chart',
      patient: 'Dessinez là où vous avez mal',
      clinician: 'Body chart',
      source: P,
    },
    {
      kind: 'psfs',
      id: 'psfs',
      patient:
        'Citez jusqu’à 3 activités que votre problème vous empêche de faire ou rend difficiles, et notez chacune de 0 à 10',
      clinician: 'PSFS',
      max: 3,
      lo: 'Impossible',
      hi: 'Comme avant le problème',
      source: {
        ref: 'Stratford et al. 1995, Physiotherapy Canada — formulation française provisoire, non validée',
        added: '2026-11-25',
        provisional: true,
      },
    },
    slider('exp'),
    slider('fear'),
    slider('worry'),
    {
      kind: 'yesno',
      id: 'sommeil',
      patient: 'La douleur perturbe-t-elle votre sommeil ?',
      clinician: 'Sommeil perturbé par la douleur',
      source: P,
    },
    {
      kind: 'yesno',
      id: 'arret',
      patient: 'Êtes-vous en arrêt de travail à cause de cette douleur ?',
      clinician: 'Arrêt de travail',
      source: P,
    },
  ],
  pens: [
    { id: 'douleur', label: 'Douleur', color: '#c0392b', source: P },
    { id: 'irradiation', label: 'Irradiation', color: '#e67e22', source: P },
    { id: 'fourmillements', label: 'Fourmillements', color: '#1f5fa8', source: P },
    { id: 'engourdissement', label: 'Engourdissement', color: '#7d3c98', source: P },
  ],
  patientPen: 'douleur',
};
