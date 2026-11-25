# Choix de la zone, genou et accueil patient sur la tablette — design court

Statut : approche validée par Yass le 25.11.2026 (« Parfait »). Complète la spec du 24.11.2026.

> **Fusion du 25.11.2026** : l'accueil décrit ici (body chart à zones, questions, écran patient) est remplacé par
> celui de `2026-11-25-accueil-onglets-couleurs-design.md`. Restent valables : le choix de la zone et le genou.
> Voir DECISIONS n° 46.

## Intention
Yass teste l'étape 1. Il attend (1) de choisir la zone au moment de « Nouveau bilan », (2) le genou,
(3) la partie que le patient remplit lui-même avec un body chart. L'accueil par QR code demande le relais
(étape 2) ; en attendant, le patient remplit l'accueil **sur la tablette de Yass**, qui lui est tendue.

## Approches considérées
- Attendre le relais et faire l'accueil directement par QR code : rien pour Yass avant l'étape 2. Écarté.
- **Mode accueil local sur la tablette (retenu)** : même écran que le futur QR code, les réponses vont
  directement dans le bilan chiffré. Le QR code réutilisera cet écran.
- Accueil comme simple section du bilan remplie par Yass : ne répond pas à la demande (le patient remplit).

## Décisions (appels de Claude, corrigeables)
1. **Choix de la zone** : « Nouveau bilan » ouvre un choix Épaule / Genou. La zone est fixée à la création.
2. **Genou** : fichier de contenu `src/bilan/content/knee.ts`, tout `provisional: true`, aucun chiffre
   diagnostique (règle existante). Structure tirée du document « Bilan du genou » (CPG JOSPT 2017, 2018,
   2019) : anamnèse (mécanisme, délai d'épanchement, accrochages, dérobements), drapeaux (Ottawa, genou chaud
   fébrile, TVP, cancer, luxation), épanchement (stroke test 5 grades), mobilité, force, performance (hop
   tests), tests par structure, raisonnement, plan. Les questionnaires du genou (KOOS, IKDC, KOOS-PF,
   VISA-P, ACL-RSI) ne sont pas encore dans la banque : aucune règle ne les cible pour l'instant.
3. **Accueil** (spec §5.2) : douleur actuelle et pire 0–10, durée, début, body chart, PSFS (3 activités
   0–10), 5 questions de dépistage (sommeil, pression au travail, arrêt de travail, peur que bouger
   aggrave, isolement). Vouvoiement, langage courant.
4. **Mode patient** : bouton « Accueil patient » dans le bilan. L'écran patient ne montre ni l'identité,
   ni la liste, ni le bilan. « J'ai terminé » → écran « Merci, rendez la tablette ». Le retour au bilan
   demande le PIN.
5. **Body chart** : silhouettes face et dos faites de zones cliquables (boutons accessibles,
   `aria-pressed`). Côtés D/G du point de vue du patient. Affiché en lecture seule dans le bilan.
6. **Stockage** : champ optionnel `intake` dans `BilanState` (les bilans existants restent valides),
   chiffré comme le reste.
7. **Exports** : l'accueil apparaît dans le PDF et en tête du bloc SYSmeta « Anamnèse » (sans identité).

## Après relecture (25.11.2026)
- Si l'enregistrement de l'accueil échoue, le patient ne lit pas « réponses enregistrées » ; un nouvel essai est fait à la reprise par le PIN.
- L'accueil est enregistré comme brouillon à chaque réponse (non terminé), pour ne rien perdre si la page se ferme.
- Sur un écran de moins de 600 px, le body chart montre une vue à la fois (bascule face / dos) pour des zones assez grandes au doigt.
- Les activités du PSFS sont du texte libre écrit par le patient : elles passent dans le bloc SYSmeta tel quel. Si un patient y écrit un nom, il faut le retirer avant de coller.

## Hors périmètre (étape 2 ou plus tard)
Règles déclenchées par l'accueil (body chart diffus ou > 3 mois → CSI-25), QR code, questionnaires du
genou dans la banque, IA.

## Tâches
1. `ZoneDef.id` + `'knee'`, contenu genou, `ZONES.knee` ; test de validation du contenu.
2. `Intake` + action `intake` du reducer ; tests.
3. Body chart (données des zones + composant) ; tests.
4. Écran d'accueil patient + mode patient + retour par PIN ; tests.
5. Choix de la zone dans « Mes bilans » ; affichage de l'accueil dans le bilan ; exports ; tests.
6. Suite complète, lint, typecheck, build, vérification dans Chrome à 360 et 1024 px, PR.
