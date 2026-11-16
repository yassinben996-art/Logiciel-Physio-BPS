// Cibles de traitement chiffrées « départ → objectif » (targets() du prototype, textes inchangés).
import { fr } from './format';
import { num } from './analyze';
import type { Analysis, CaseState, DomainId, SliderId } from './types';

export function targets(id: DomainId, s: CaseState, X: Analysis): string[] {
  const c = s.chk;
  const T: string[] = [];
  const pain = num(s.pain);
  const dis = num(s.dis);
  const v = (k: SliderId) => num(s.sl[k]);

  if (id === 1) {
    if (pain !== null)
      T.push(
        `Douleur : réduction d’au moins 20 % (${fr(pain)}/10 vers ${fr(Math.round(pain * 8) / 10)}/10 ou moins). Seuil minimal utilisé dans les essais PDDM.`,
      );
    if (dis !== null)
      T.push(
        `Incapacité (${s.instr}) : réduction d’au moins 20 % par rapport à ${fr(dis)} %. Perception du patient : « considérablement amélioré » (PGIC ≥ 3).`,
      );
    T.push(
      s.goal.trim()
        ? `Retrouver l’activité choisie par le patient : ${s.goal.trim()}`
        : 'Retrouver une activité choisie par le patient (à nommer).',
    );
    if (c.a_dp)
      T.push(
        'Utiliser la direction qui centralise ou soulage comme exercice de base ; vérifier la réponse à chaque séance.',
      );
    if (c.a_stiff)
      T.push('Récupérer l’amplitude passive, en particulier la rotation externe, par paliers mesurés.');
  }
  if (id === 2) {
    T.push('Le patient explique sa douleur avec ses mots, sans la réduire à une lésion.');
    T.push('Réduire les poussées après effort grâce à un dosage progressif (pacing).');
    if (X.csiPos) T.push(`CSI-${s.csiType === 'csi9' ? '9' : '25'} : ${s.csi} vers un score sous ${X.cut}.`);
    if (c.n_sens || c.co_sleep)
      T.push(
        'Améliorer le sommeil et la tolérance aux stimulations (routine de sommeil, exposition progressive).',
      );
  }
  if (id === 3) {
    T.push('Stabiliser ou améliorer le déficit neurologique, réévalué à chaque séance.');
    const pd = num(s.pd);
    if (pd !== null && pd >= 13) T.push(`painDETECT : ${pd} vers moins de 13.`);
    if (c.r_B) T.push('Aucune aggravation tolérée : avis médical rapide.');
  }
  if (id === 4) {
    T.push('Chaque comorbidité retenue est suivie et stabilisée avec le médecin traitant.');
    if (c.co_sleep) T.push('Sommeil récupérateur, suivi au fil des séances.');
    if (c.co_obes || c.co_diab || c.co_cv)
      T.push('Activité physique régulière adaptée à l’état cardio-métabolique.');
  }
  if (id === 5) {
    const exp = v('exp');
    const eff = v('eff');
    const fear = v('fear');
    const struct = v('struct');
    const worry = v('worry');
    const dist = v('dist');
    if (exp !== null && exp <= 4) T.push(`Attentes de récupération : ${exp}/10 vers 6/10 ou plus.`);
    if (eff !== null && eff <= 4) T.push(`Auto-efficacité : ${eff}/10 vers 6/10 ou plus.`);
    if (fear !== null && fear >= 6)
      T.push(
        `Peur du mouvement : ${fear}/10 vers 4/10 ou moins. Si FABQ : −4 points (activité physique) ou −7 points (travail) = changement jugé significatif dans l’essai PDDM.`,
      );
    if (struct !== null && struct >= 6)
      T.push(
        `Croyance « région abîmée » : ${struct}/10 vers 4/10 ou moins, par l’explication et l’expérience du mouvement.`,
      );
    if (worry !== null && worry >= 6) T.push(`Inquiétude : ${worry}/10 vers 4/10 ou moins.`);
    if (dist !== null && dist >= 6)
      T.push(`Détresse : ${dist}/10 vers 4/10 ou moins, avis médical si elle persiste.`);
    if (c.b_avoid) T.push('Reprendre par paliers une activité évitée, nommée avec le patient.');
    if (c.b_persist) T.push('Dosage de l’activité : alterner effort et récupération, sans poussée marquée.');
    if (c.b_safety) T.push('Réduire les comportements de sécurité (collier, repos, vérifications).');
  }
  if (id === 6) {
    if (c.e_load || c.e_phys)
      T.push('Ajuster la charge, les gestes et les pauses au poste, avec le patient.');
    if (c.e_inact) T.push('Activité régulière : fréquence convenue avec le patient et suivie.');
    if (c.e_smoke) T.push('Proposer un soutien au sevrage tabagique.');
    if (c.e_sleep) T.push('Installer une routine de sommeil réaliste.');
    if (c.e_supp) T.push('Identifier une personne ressource au travail ou à la maison.');
    if (c.e_sick || c.e_lit) T.push('Plan de retour au travail documenté, avec les acteurs concernés.');
    if (c.e_fin || c.e_iso) T.push('Orienter vers un soutien social adapté.');
  }
  return T;
}
