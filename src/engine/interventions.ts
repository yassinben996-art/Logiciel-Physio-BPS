// Interventions par volet (interventions() du prototype, textes et références inchangés).
import type { Analysis, CaseState, DomainId, Evidence, Intervention } from './types';

export function interventions(id: DomainId, s: CaseState, _X?: Analysis): Intervention[] {
  void _X;
  const r = s.region;
  const c = s.chk;
  const L: Intervention[] = [];
  const add = (t: string, d: string, ev: Evidence, rs: string[] = []) => L.push({ t, d, ev, r: rs });

  if (id === 1) {
    if (r === 'cervical') {
      add(
        'Éducation, réassurance, rester actif',
        'Évolution le plus souvent favorable. L’éducation seule ne suffit pas : elle accompagne l’exercice.',
        'CPG',
        ['cote16', 'bier17', 'blan17'],
      );
      add(
        'Exercices d’amplitude puis de renforcement, avec mobilisation ou manipulation',
        'Soins multimodaux. Au-delà de 3 mois : renforcement supervisé, exercices en groupe, yoga ou massage clinique. Les guidelines recommandent la manipulation mais décrivent rarement le dépistage vasculaire : ne l’utiliser qu’après un dépistage soigneux.',
        'CPG',
        ['cote16', 'buss16', 'blan17', 'peters25'],
      );
      add(
        'Ce qu’OPTIMa déconseille',
        'Collier cervical, traction, électrothérapie, éducation seule, renforcement seul au-delà de 3 mois. Le guideline néerlandais tolère un collier bref en grade III.',
        'CPG',
        ['cote16', 'bier17'],
      );
      if (c.a_dp)
        add(
          'Préférence directionnelle ou centralisation',
          'Indicateurs pronostiques utiles, mais preuve limitée pour la nuque et pas de preuve fiable qu’ils modifient l’effet du traitement.',
          'RCT',
          ['may18'],
        );
    } else if (r === 'lumbar') {
      add(
        'Éducation, réassurance, reprise des activités habituelles',
        'Pronostic favorable, éviter le repos au lit, expliquer ce qu’est une poussée.',
        'CPG',
        ['oliv18', 'wong16', 'foster18'],
      );
      add(
        'Exercice supervisé',
        'Choisir le type selon la préférence et la tolérance : les guidelines détaillent peu la dose.',
        'CPG',
        ['foster18', 'zaina23'],
      );
      if (c.a_dp)
        add(
          'Exercices selon la préférence directionnelle (McKenzie)',
          'Lombalgie chronique avec préférence directionnelle : gain cliniquement important sur la douleur à court terme et sur l’incapacité à moyen terme, certitude faible à modérée.',
          'RCT',
          ['henn24', 'may18'],
        );
      add(
        'Thérapie manuelle en complément',
        'Manipulation ou mobilisation, intégrée à l’exercice et à l’éducation.',
        'CPG',
        ['wong16', 'zaina23'],
      );
      if (c.a_instab)
        add(
          'Contrôle moteur et renforcement lombaire progressif',
          'Un essai en cours (STRONG-BACK) associe le modèle PDDM et le questionnaire d’instabilité lombaire. Pas encore de résultats.',
          'EXP',
          ['fortin26'],
        );
      add('Imagerie non systématique', 'La réserver aux suspicions de pathologie spécifique.', 'CPG', [
        'oliv18',
      ]);
    } else {
      if (c.a_load || (!c.a_stiff && !c.a_instab && !c.a_oa)) {
        add(
          'Programme d’exercices actif, orienté tâche, avec éducation',
          'Premier choix pour la douleur de la coiffe. Progression par critères plutôt que par durée.',
          'CPG',
          ['lafr22', 'desm25', 'lowry23', 'chep25'],
        );
        add(
          'Ce que les guidelines ne recommandent pas',
          'Décompression sous-acromiale pour la tendinopathie de la coiffe. Imagerie réservée à des cas ciblés.',
          'CPG',
          ['lafr22', 'lowry23'],
        );
      }
      if (c.a_stiff)
        add(
          'Capsulite : infiltration précoce et programme à domicile',
          'Le corticoïde intra-articulaire précoce (symptômes de moins d’un an) donne le meilleur bénéfice à court terme ; ajouter un programme d’exercices simples. Prescription par le médecin. Éducation sur l’évolution parfois longue.',
          'RCT',
          ['chall20', 'lee25'],
        );
      if (c.a_instab || c.a_oa)
        add(
          'Exercice adapté au diagnostic',
          'Les guidelines recommandent ou envisagent la rééducation active pour tous les troubles de l’épaule : renforcement et contrôle neuromusculaire selon l’instabilité ou l’arthrose.',
          'CPG',
          ['lowry23'],
        );
    }
  }
  if (id === 2) {
    add(
      'Éducation à la neurophysiologie de la douleur (PNE), en face à face',
      'Seule : effets faibles à court terme (douleur −5,9/100, incapacité −4,1/100). Associée à l’exercice, elle réduit nettement la kinésiophobie (SMD −1,20, certitude modérée).',
      'RCT',
      ['watson19', 'sidd21', 'lepri23'],
    );
    add(
      'Exercice progressif dosé',
      'Charge croissante par petits paliers pour éviter les poussées, sans tout arrêter pendant une crise.',
      'NR',
    );
    add(
      'Sommeil comme cible',
      'La PNE est associée à un petit gain de temps de sommeil total (SMD 0,42), davantage en combinaison avec l’exercice ou l’approche cognitivo-comportementale.',
      'RCT',
      ['khan26'],
    );
    add(
      'Lire le dépistage avec prudence',
      'Le CSI repère un risque, il ne pose pas de diagnostic. Seuil CSI-9 de 20 : discrimine fibromyalgie et troubles musculo-squelettiques ; des études donnent 17 à 18 selon la population.',
      'OBS',
      ['tanaka19', 'nijs21'],
    );
    if (r === 'shoulder')
      add(
        'Phénotypage de l’épaule',
        'Un guide clinique récent propose de distinguer douleur nociceptive, neuropathique et nociplastique à l’épaule.',
        'EXP',
        ['debaets25'],
      );
  }
  if (id === 3) {
    if (r === 'cervical') {
      add(
        'Confirmer la radiculopathie par un groupe de tests',
        'Spurling, distraction, ULNT1 et rotation < 60°, ou Spurling plus traction plus arm squeeze, toujours cohérents avec l’histoire. Quatre ULNT négatifs avec arm squeeze permettent de l’exclure.',
        'OBS',
        ['thoo17', 'grond26'],
      );
      add(
        'Prise en charge conservatrice, réévaluation à chaque séance',
        'La radiculopathie est couverte par le guideline néerlandais. Signes neurologiques persistant plus de 3 mois : avis médical.',
        'CPG',
        ['bier17', 'cote16'],
      );
      if (c.r_B)
        add(
          'Suspicion de myélopathie',
          'Hoffmann, Babinski, clonus, hyperréflexie : imagerie et avis spécialisé.',
          'OBS',
          ['jiang23'],
        );
    } else if (r === 'lumbar') {
      add(
        'Radiculopathie lombaire',
        'La manipulation peut aider en cas de hernie discale avec radiculopathie. Avis spécialisé si suspicion de radiculopathie sévère ou pas d’amélioration à 4 semaines.',
        'CPG',
        ['wong16', 'oliv18'],
      );
      add(
        'painDETECT élevé',
        'Dans un pilote PDDM lombaire, chaque point de plus était associé à moins de chances d’amélioration à 12 semaines (OR 0,91). Résultat exploratoire.',
        'OBS',
        ['long23b'],
      );
    } else {
      add(
        'Ordre de grandeur à l’épaule',
        'Chez 73 patients avec une épaule chronique non traumatique : 26 % de douleur neuropathique et 28,8 % de nociplastique ; la neuropathique était la plus liée à l’incapacité.',
        'OBS',
        ['ferah26'],
      );
      add(
        'Écarter une origine cervicale',
        'Dépistage cervical et neurologique avant d’attribuer la douleur à l’épaule.',
        'NR',
      );
    }
  }
  if (id === 4) {
    add(
      'Coordonner avec le médecin traitant',
      'Les comorbidités et le sommeil font partie du plan, pas du décor.',
      'EXP',
      ['web26'],
    );
    if (c.co_multi)
      add('Douleur multisite', 'Élargir l’évaluation au volet nociplastique et à la charge globale.', 'EXP');
    if (r === 'shoulder' && (c.a_stiff || c.co_diab || c.co_thy || c.co_lip))
      add(
        'Capsulite et facteurs métaboliques',
        'Diabète, maladie thyroïdienne et dyslipidémie augmentent le risque de capsulite.',
        'CPG',
        ['lee25'],
      );
    if (r === 'shoulder' && (c.co_mood || c.a_stiff))
      add(
        'Anxiété et pronostic',
        'Dans une cohorte de 80 patients avec capsulite, l’anxiété (trait et état) prédisait douleur et incapacité à 3 mois.',
        'OBS',
        ['brin26'],
      );
    add(
      'Activité, poids, tabac',
      'Principes EULAR pour les maladies rhumatismales : exercice, poids, sevrage tabagique, participation au travail. Extrapolés ici aux douleurs musculo-squelettiques.',
      'CPG',
      ['gwin22'],
    );
  }
  if (id === 5) {
    if (r === 'cervical')
      add(
        'Pourquoi cibler ce volet',
        'Catastrophisme et détresse psychologique prédisent persistance et récidive de la douleur cervicale (certitude faible à modérée).',
        'OBS',
        ['yu25', 'gerard24'],
      );
    if (r === 'shoulder')
      add(
        'Pourquoi ce volet pèse moins ici',
        'Après physiothérapie, attentes de récupération et auto-efficacité prédisent l’évolution ; peur, catastrophisme et détresse sont peu ou pas prédictifs en conservateur. Après chirurgie, la peur du mouvement prédit l’évolution.',
        'OBS',
        ['debaets19', 'sheik21', 'mart18'],
      );
    add(
      'Laisser le patient raconter son histoire',
      'Nommer ses croyances (fragilité, peur, attentes) avant d’expliquer. Les patients décrivent ce temps comme un élément clé de la PNE.',
      'OBS',
      ['watson19'],
    );
    add(
      'Éducation personnalisée liée au mouvement',
      'Combiner explication et exercice : meilleur effet sur la peur et le catastrophisme que l’exercice seul.',
      'RCT',
      ['sidd21', 'foster18'],
    );
    if (r === 'lumbar')
      add(
        'Thérapie cognitivo-fonctionnelle (CFT)',
        'Lombalgie chronique invalidante : −4,6 points au Roland-Morris contre soins usuels à 13 semaines, effet maintenu à 52 semaines ; supérieure à un programme de groupe sur l’incapacité à 6 et 12 mois.',
        'RCT',
        ['kent23', 'okeeffe19', 'marelli25'],
      );
    if (r === 'cervical')
      add(
        'Approche de type CFT',
        'Un seul essai pour la nuque (n = 72), certitude faible à très faible : à utiliser comme piste, pas comme standard.',
        'RCT',
        ['marelli25'],
      );
    add(
      'Exposition graduelle aux mouvements redoutés',
      'Hiérarchiser les activités évitées, progresser par paliers, mesurer la peur avant et après.',
      'EXP',
      ['web26'],
    );
    if (c.b_avoid)
      add(
        'Évitement',
        'Comprendre ce que le patient évite, puis remplacer la stratégie d’évitement par une autre.',
        'EXP',
        ['web26'],
      );
    if (c.b_persist)
      add(
        'Persistance',
        'Dosage de l’activité (pacing) : expliquer que s’irriter à répétition n’aide pas.',
        'EXP',
        ['web26'],
      );
    if (c.b_safety && r === 'cervical')
      add(
        'Recherche de sécurité : collier',
        'À éviter : non recommandé par OPTIMa, toléré brièvement en grade III par le guideline néerlandais.',
        'CPG',
        ['cote16', 'bier17'],
      );
  }
  if (id === 6) {
    add(
      'Plan de retour au travail précoce',
      r === 'shoulder'
        ? 'Construit avec le patient et les acteurs du travail, avec plusieurs stratégies combinées.'
        : 'Interventions de santé au travail intégrées à la prise en charge.',
      'CPG',
      r === 'shoulder' ? ['lafr22', 'doir20'] : ['foster18'],
    );
    if (c.e_load || c.e_phys)
      add(
        'Adaptation du poste et de l’organisation',
        'Tâches, rythme, pauses, gestes. Les guidelines de la coiffe citent l’adaptation de l’organisation du travail.',
        r === 'shoulder' ? 'CPG' : 'EXP',
        r === 'shoulder' ? ['doir20'] : [],
      );
    if (c.e_inact || c.e_smoke)
      add(
        'Activité physique et tabac',
        'Le tabagisme (OR 1,24) est associé au passage à la douleur chronique, avec certitude modérée.',
        'OBS',
        ['dunn24', 'gwin22'],
      );
    if (c.e_supp || c.e_iso || c.e_fin)
      add(
        'Soutien social et statut socio-économique',
        'Soutien faible (OR 1,21) et statut socio-économique bas (OR 2,0) sont associés à la chronicisation, certitude modérée.',
        'OBS',
        ['dunn24'],
      );
    add(
      'Besoins sociaux',
      'Soins informés par les besoins (adapter le plan) ou ciblés sur le besoin (agir avec l’assistant social).',
      'EXP',
      ['web26'],
    );
  }
  return L;
}
