# Bilan physio standardisé avec IA — document de conception

Date : 24.11.2026 · Auteur : Claude, avec Yassine Bensaid (physiothérapeute, Aquamed Flon, Lausanne)
Statut : validé par Yass le 24.11.2026

## 1. Intention

Yass veut des bilans « parfaits » : complets, chiffrés, reproductibles et alignés sur la littérature, pour mieux conduire ses rééducations. Aujourd'hui, ses bilans sont rédigés en texte libre dans SYSmeta (le logiciel patient d'Aquamed). Ils sont qualitatifs (« faiblesse accrue en RE », « RI ok »), donc non comparables au rebilan, et il y manque des blocs entiers : body chart, comportement de la douleur, questionnaires, objectifs du patient, raisonnement.

L'outil sert de **guide pratique pendant la séance**. Il propose une structure standardisée par zone, des champs chiffrés et une IA qui suit ce qu'il note et lui suggère les prochains tests et questionnaires. Il produit en fin de parcours un PDF du bilan. Les questionnaires sont proposés au patient au cas par cas et remplis chez lui via un QR code.

Usage : **personnel**, non commercial. Un site web d'abord, décliné peut-être plus tard en application.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un bilan structuré par zone, avec la même trame à chaque fois et des mesures chiffrées.
- Zones : épaule, lombaire et cervical, plus une couche transversale « douleur chronique » (voir §5bis).
- Une IA qui suggère, avec la raison de chaque suggestion : tests à ajouter, red flags à creuser, questionnaires à proposer.
- Des questionnaires **ciblés**, jamais systématiques. Le patient n'en remplit aucun « pour la forme ».
- Un PDF du bilan, plus des blocs de texte calqués sur les rubriques de SYSmeta, à copier-coller sans double saisie.
- Un contenu clinique enrichi petit à petit : d'abord une revue de la littérature, puis les formations de Yass.

**Non-objectifs**
- L'outil ne remplace pas SYSmeta, qui reste le dossier patient officiel.
- Pas de produit commercial ni multi-utilisateur pour l'instant.
- Ce n'est ni un dispositif médical ni un outil de diagnostic. Le bandeau « aide au raisonnement clinique, non validée » est conservé, comme dans l'app PDDM.

**Anti-objectifs** (l'outil aurait échoué même s'il « marche »)
- La saisie ralentit la séance plus que le texte libre actuel.
- L'IA coche ou décide à la place du clinicien.
- Le bilan devient une collection de questionnaires imposés au patient.
- L'outil dépend d'un abonnement payant, d'un compte Claude ou d'une connexion à Claude.
- Une donnée d'identité du patient est envoyée à l'IA, figure dans « Copier pour Claude », ou devient lisible par le relais.

## 3. Contraintes

- **Identité du patient (révisé le 24.11.2026, accord d'Aquamed obtenu par Yass).** Nom, prénom et date de naissance peuvent être saisis. Ils sont stockés **uniquement chiffrés** : sur l'appareil, et sur le relais, chiffrés de bout en bout. Ils figurent dans le PDF, mais ne sont **jamais** envoyés à l'IA, ni inclus dans « Copier pour Claude » ou dans les blocs SYSmeta. Le code court (`B-4821`) reste l'identifiant technique, notamment pour les QR codes patients. La tablette est l'appareil personnel de Yass ; l'app reste verrouillée par un code PIN. Cadre suisse : nLPD.
- **Gratuité.** Hébergement, IA et relais doivent tenir dans des offres gratuites. Un passage au payant reste possible plus tard, par un réglage, sans rien reconstruire.
- **Sans compte Claude.** L'outil doit tourner sur la tablette de Yass (appareil personnel, où il ne veut pas connecter son compte Claude), sur son téléphone et sur son ordinateur.
- **Questionnaires sous licence restrictive** (painDETECT, STarT MSK, ODI) : leurs textes restent hors de git, dans `private/questionnaires.ts`, comme aujourd'hui. Ce fichier n'est pas dans le dépôt, mais son contenu a été retrouvé le 24.11.2026 dans la version personnelle publiée en artifact claude.ai (« Profil des moteurs de douleur », slug `4dfcb246-dd63-4ecb-b277-688075c3623c`) : painDETECT (traduction personnelle), STarT MSK, ODI, etc. On le reconstituera à partir de là à l'étape 3. Yass a aussi fourni les PDF français du STarT MSK et de l'ODI.
- **Rigueur scientifique.** Aucun seuil, chiffre ni référence inventé. Tout contenu clinique est sourcé ou marqué « choix de conception ». C'est la règle du projet de recherche de Yass, déjà appliquée dans le dépôt (voir `DECISIONS.md`).

## 4. Approches considérées

| Approche | Résumé | Verdict |
|---|---|---|
| A. Zéro serveur, règles seules | Le patient renvoie un code-réponse par SMS, que Yass colle dans l'outil | Écartée : trop lourd pour le patient, qui doit penser à renvoyer le code |
| Hébergement dans les Artifacts Claude | La page appelle Claude via l'abonnement de Yass | Écartée : il faut un compte Claude connecté (refusé pour la tablette du travail), l'outil devient dépendant de l'abonnement, et le stockage partagé des Artifacts exige que les patients soient connectés |
| C. Règles + LLM payant (API Claude) | La meilleure qualité de raisonnement | Reportée : Yass veut rester sur du gratuit pour l'instant. Prévue comme réglage (Claude Haiku 5.5) |
| **B. App web autonome + règles + LLM gratuit + petit relais** | Voir ci-dessous | **Retenue** |

Fournisseurs de LLM gratuits comparés (le 24.11.2026) :
- **Gemini API** : écarté. Ses conditions interdisent l'usage en pratique clinique et n'autorisent que les services payants pour une app destinée à des utilisateurs en Suisse.
- **Mistral** : écarté au départ parce que son offre gratuite peut entraîner ses modèles sur les données. **Réintégrable** depuis la révision ci-dessous, si ses conditions ne l'interdisent pas pour un usage clinique.
- **IA dans le navigateur** (modèle local) : reportée. Modèle lourd à télécharger, lent et moins bon sur tablette.
- **Groq** : **retenu**. Offre gratuite sans carte bancaire ; le contrat interdit l'entraînement sur les données ; « Zero Data Retention » activable. Les données sont traitées aux États-Unis, ce qui reste acceptable puisque l'identité n'est jamais envoyée et que les noms dans les notes sont nettoyés. Modèle : `openai/gpt-oss-120b`.

## 5. Ce qui a été décidé

### 5.1 Base technique
- On étend le dépôt existant **Logiciel-Physio-BPS** (Vite + React 18 + TypeScript strict, Vitest, jsPDF, GitHub Pages).
- L'app **« Profil des moteurs de douleur » (PDDM) devient un module** du nouvel outil, appelé depuis la section Raisonnement. Son moteur, ses tests et sa parité avec le prototype doivent rester intacts.
- L'interface est responsive pour ordinateur, téléphone et tablette. **Sauvegarde automatique dès l'étape 1** (demande de Yass) : chaque saisie est enregistrée chiffrée sur l'appareil. La synchronisation entre appareils arrive avec le relais.
- **Tout le contenu clinique est dans des fichiers de données séparés du code** : sections, champs, tests et leurs propriétés diagnostiques, red flags, pastilles, règles de suggestion, mots-clés. Le but est de pouvoir y verser la littérature puis les formations de Yass sans toucher à la logique.
- **Modularité exigée par Yass** : tout doit pouvoir évoluer « à la guise » au fil de l'usage. Ajouter, retirer ou réordonner une section, un test, une pastille, une règle ou un questionnaire ne doit demander qu'une modification du fichier de contenu concerné, jamais du code, et chaque élément de contenu porte sa source et sa date d'ajout. L'épaule est la zone pilote.

### 5.2 Parcours
1. **Accueil, avant la séance (environ 5 min).** Le patient scanne un QR code, en salle d'attente ou chez lui s'il le reçoit à la prise de rendez-vous, et remplit un court questionnaire :
   - zone, durée, début (brutal ou progressif), douleur 0–10 ;
   - **body chart** où il colorie les zones douloureuses ;
   - **PSFS** : 3 activités problématiques notées de 0 à 10 ;
   - 4 ou 5 questions de dépistage reprises du parcours patient existant (ressentis, sommeil, travail).
2. **Séance.** Yass remplit le bilan structuré (§5.3). L'IA lit les réponses d'accueil et ce qu'il saisit au fur et à mesure.
3. **Fin de séance.** L'IA propose **1 à 3 questionnaires ciblés**, chacun avec sa raison. Yass valide ou modifie la sélection, puis montre le QR code. Le patient remplit chez lui.
4. **Avant la séance suivante.** Les scores remontent dans le bilan. Le PDF complet est généré, accompagné des blocs de texte pour SYSmeta.

### 5.3 Structure du bilan (version 0, à compléter)
1. **Accueil** : prérempli par le patient.
2. **Anamnèse** : mécanisme, comportement de la douleur sur 24 h, facteurs aggravants et soulageants, irritabilité, antécédents, traitements et imagerie, sport et travail, attentes.
3. **Drapeaux** : checklist des red flags propre à la zone ; yellow flags préremplis depuis l'accueil.
4. **Examen**, entièrement chiffré :
   - mobilités active et passive en degrés ;
   - force au dynamomètre, comparée au côté sain (avec ratio RE/RI pour l'épaule) ;
   - tests spécifiques regroupés en clusters, avec leurs propriétés diagnostiques affichées ;
   - tests de modification des symptômes.
5. **Raisonnement** : hypothèse principale, diagnostics différentiels, module PDDM.
6. **Plan** : objectifs repris du PSFS, axes de traitement, critères et date du rebilan.

Yass estime que des sections manquent. **Première étape de construction : une revue de la littérature** sur la structure d'un bilan musculo-squelettique, par zone. Elle propose les sections manquantes et le contenu de chaque zone : tests, valeurs diagnostiques, red flags. Elle est rendue sous forme de document que Yass valide avant l'intégration. Ses formations viendront s'ajouter ensuite, au fil de l'eau.

### 5.4 Saisie
- Chaque section comporte des **champs structurés** (cases, chiffres, tests +/−) et un **champ de notes libres**. Le patient « blablate » : le texte libre doit rester confortable.
- Des **pastilles rapides** (`nocturne`, `irradiation`, `paresthésies`…) se cochent d'un tap pendant que le patient parle.
- **Détection de mots-clés** dans les notes, sur l'appareil : l'outil propose de cocher la pastille correspondante (« Tu as noté "fourmillements" : cocher paresthésies ? »). **Rien n'est jamais coché automatiquement**, et Yass confirme toujours. C'est ce qui règle le problème des négations.
- La dictée du clavier du système (iOS ou Android) peut être utilisée telle quelle ; il n'y a rien à développer.

### 5.5 IA
Deux couches :
- **Un moteur de règles**, déterministe, gratuit, qui tourne hors ligne et qui est testé. Il donne les suggestions instantanées : clusters de tests, red flags, choix des questionnaires. Chaque suggestion affiche sa raison et sa source.
- **Un LLM** (Groq, `openai/gpt-oss-120b`). Il lit les notes libres et les données structurées, puis propose hypothèses, tests et questionnaires complémentaires.
  - Il est **déclenché par section**, ou par un bouton « Suggérer », jamais en continu.
  - On lui envoie un résumé compact du bilan, pas tout l'historique.
  - Les champs d'identité ne sont jamais inclus dans la requête. Les **noms propres, dates et lieux** présents dans les notes sont en plus **nettoyés automatiquement** avant l'envoi.
  - Ses réponses sont structurées. Ses suggestions s'affichent comme celles des règles, avec leur raison, et Yass les accepte ou les refuse.
  - **Quota.** Les limites de l'offre gratuite annoncées, avec une ambiguïté sur l'offre concernée, sont de 30 requêtes par minute, 1 000 par jour, 8 000 tokens par minute et 200 000 tokens par jour, par modèle. Cela correspond à environ 6 bilans complets par jour, à raison d'environ 5 appels de 6 000 tokens par bilan.
  - **Bascule automatique (demande de Yass, 24.11.2026).** Quand le quota d'une IA est épuisé ou qu'elle est en panne, l'outil passe tout seul à la suivante d'une chaîne configurable : (1) Groq `openai/gpt-oss-120b`, (2) un autre modèle Groq, chacun ayant ses propres quotas, aux mêmes conditions de données, (3) d'autres fournisseurs gratuits, éventuellement plus performants. **Révision du 24.11.2026 (Yass)** : il accepte qu'ils conservent les données ou s'en servent pour entraîner leurs modèles, puisque l'identité n'est jamais envoyée. Seule condition restante : leurs conditions d'utilisation ne doivent pas interdire l'usage clinique, et le service doit être accessible depuis la Suisse. Gemini reste exclu, parce que ses conditions interdisent la pratique clinique. Candidats à vérifier au plan 2 : Cerebras, Mistral, modèles gratuits d'OpenRouter. (4) les règles seules. Un indicateur affiche l'IA utilisée.
  - Le **fournisseur est interchangeable** par un réglage (Groq gratuit ou Claude Haiku 5.5 payant), avec la même interface côté code.
  - La **clé d'API n'est jamais dans la page** : elle est stockée sur le relais (§5.7).
- Un bouton **« Copier pour Claude »** génère le bilan anonymisé, accompagné d'une consigne déjà rédigée, à coller manuellement dans Claude pour un avis approfondi. Il n'y a aucun lien technique avec Claude.

### 5.6 Questionnaires
- La **banque existe** dans le dépôt, avec le calcul des scores et des tests :
  - publics (`src/questionnaires/public.ts`) : NDI, QuickDASH, SPADI, CSI-25, TSK, PCS, FABQ, PSEQ ;
  - privés (`private/`, hors git) : painDETECT, STarT MSK, ODI.
- **À ajouter** : le PSFS, pour l'accueil.
- **Questionnaire d'épaule par défaut : SPADI** (décision de Yass du 24.11.2026, sur la base de la revue de littérature épaule). Le QuickDASH reste disponible.
- **Logique de déclenchement**, en exemples :
  - fonction de la zone → QuickDASH, ODI ou NDI, pour avoir une mesure de base ;
  - body chart diffus ou douleur de plus de 3 mois → CSI-25 ;
  - irradiation ou douleur d'allure neuropathique → painDETECT ;
  - peur du mouvement notée → TSK (FABQ pour les lombaires) ;
  - catastrophisme noté → PCS ;
  - faible confiance → PSEQ.
  Les règles exactes viendront de la revue de la littérature (§5.3).
- OSPRO-YF et ÖMPSQ-SF ont été évoqués comme alternatives. Ils ne sont pas retenus pour l'instant : pas de version française validée trouvée pour l'OSPRO-YF.
- **painDETECT, STarT MSK et l'ODI passent aussi par le QR code** (décision de Yass) : leurs textes sont servis par le relais, uniquement à un lien de bilan valide, et ne sont jamais présents dans le site public ni dans git. Yass a fourni les versions françaises le 24.11.2026. Le STarT MSK français inclut la cotation de la question de douleur : EVN 0–4 = 0 point, 5–6 = 1, 7–8 = 2, 9–10 = 3 (complète DECISIONS n° 36).
- **painDETECT : on garde la traduction personnelle de Yass**, déjà utilisée dans le PDDM (`private/questionnaires.ts`, DECISIONS n° 28), avec l'avertissement « traduction non validée » affiché à côté du score (décision de Yass du 24.11.2026). Le DN4 (conçu en français, rempli par le clinicien en séance ; Bouhassira 2005, doi:10.1016/j.pain.2004.12.010) reste une option à ajouter plus tard si besoin.

### 5.7 Relais et stockage
C'est un petit service gratuit, hébergé en Europe, qui a trois rôles :
1. **Stocker les bilans (décision de Yass).** Un bilan est conservé chiffré de bout en bout entre la première séance et le rebilan, et au-delà pour l'historique. Le but est de pouvoir l'ouvrir sur la tablette, le téléphone ou l'ordinateur et de comparer le rebilan au bilan initial. **La clé de chiffrement n'existe que sur les appareils de Yass** : le serveur ne voit que des données illisibles, rattachées à un code.
2. **Recevoir les réponses du patient.** Elles sont chiffrées pour le bilan concerné, puis intégrées au bilan et supprimées du « casier » patient une fois récupérées.
3. **Relayer les appels au LLM** en gardant la clé d'API cachée, et servir les textes des questionnaires sous licence (§5.6).

Le fournisseur reste à choisir, après vérification de ses conditions gratuites, de la localisation des données et de la conservation.

## 5bis. Décisions prises par Claude, à vérifier par Yass
- **Protection d'accès sans compte.** Chaque appareil de Yass est appairé une fois au relais par un code PIN, qui lui donne un secret et la clé de chiffrement. Un nouvel appareil s'appaire en scannant un QR code affiché sur un appareil déjà appairé. Le code court du bilan (`B-4821`) sert seulement à l'affichage. Le QR code du patient contient un jeton long, aléatoire et à usage limité, impossible à deviner. Les appels au LLM n'acceptent que les appareils appairés, ce qui empêche un tiers de vider le quota.
- **Zones.** Épaule, lombaire et cervical (le contenu cervical existe déjà dans le PDDM). **La douleur chronique n'est pas une zone, mais une couche transversale** : elle s'active d'elle-même (douleur de plus de 3 mois, body chart diffus, signaux de sensibilisation) ou sur demande, et ajoute ses sections, ses questionnaires et ses règles à la zone. Un bilan a **une zone principale**, et des zones secondaires peuvent être notées.
- **Le PDDM dans le nouvel outil.** Le nouvel accueil de 5 minutes remplace, dans le nouvel outil, le parcours patient de 10 minutes du PDDM. L'écran PDDM est prérempli à partir du bilan (douleur, scores CSI et painDETECT, yellow flags, comorbidités), et Yass peut corriger ces valeurs. Le score painDETECT préremplit le volet neuropathique. Le moteur PDDM et ses tests de parité ne changent pas. Le déploiement public actuel du PDDM reste en ligne tel quel jusqu'à la mise en service du nouvel outil.
- **Ordre des étapes (révisé le 25.11.2026 à la demande de Yass)** : 1. socle épaule + sauvegarde locale (fait) ; 1b. accueil patient sur la tablette, onglets repliables, couleurs (voir `2026-11-25-accueil-onglets-couleurs-design.md`) ; 2. relais + synchronisation chiffrée + IA avec bascule + envoi des questionnaires ciblés par QR code (l'accueil n'est pas envoyé par QR code : passé, il est rempli par le physio en séance) ; 3. questionnaires sous licence servis par le relais et retour des scores ; 4. PDDM, lombaire, cervical, couche douleur chronique.
- **Ordre de travail.** La revue de la littérature est faite par Claude, dans le projet de recherche de Yass, en commençant par l'épaule, zone pilote. Le squelette de l'app (structure, saisie, relais, QR code, IA, PDF) est construit **en parallèle** sur un contenu provisoire, clairement marqué comme tel. Le contenu validé remplace ensuite le provisoire, zone par zone.

### 5.8 Sorties
- Un **PDF** du bilan complet : questionnaires et scores, mesures chiffrées, raisonnement, plan.
- Des **blocs de texte par rubrique SYSmeta**, à copier-coller : bilan articulaire, bilan musculaire, tests/échelles, red/yellow flags, plan de traitement.
- Le texte « Copier pour Claude » (§5.5).

## 6. Ce qui est laissé au constructeur

- Le découpage du code, le schéma des fichiers de contenu, le format des règles et la façon de faire évoluer l'architecture du dépôt.
- Le choix précis du fournisseur du relais, dans le respect des contraintes du §5.7.
- Le format exact des requêtes envoyées au LLM et le schéma de ses réponses.
- Le dictionnaire de mots-clés initial, à valider par Yass.
- Le dessin et l'implémentation du body chart.
- La mise en page du PDF.
