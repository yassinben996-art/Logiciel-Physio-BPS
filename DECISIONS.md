# Décisions et écarts par rapport au prototype

Source de vérité fonctionnelle : `reference/prototype.html`. Les règles du moteur, les textes cliniques,
les références et les cas d'exemple sont portés **à l'identique** ; un test différentiel
(`tests/parity.test.ts`) le vérifie sur 3000 cas aléatoires et sur les trois exemples.

## Règles cliniques

Aucune règle, aucun seuil ni aucun texte thérapeutique n'a été modifié ou ajouté.
Les seuils d'allumage des volets (§6 du cahier des charges) restent des **choix de conception** du prototype ;
c'est indiqué dans la section Limites, le pied de page, le résumé exporté et le README.

## Écarts assumés (affichage, robustesse)

1. **Décimales à la française** dans les cibles et le résumé (`4,8/10` au lieu de `4.8/10`), comme demandé dans
   le cahier des charges. Le test de parité normalise ce point.
2. **Valeurs hors plage ignorées** (douleur 0–10, incapacité 0–100, CSI-9 0–36, CSI-25 0–100, painDETECT −1–38) :
   un message s'affiche sous le champ et la valeur est traitée comme non saisie. Le prototype les transmettait
   telles quelles au moteur. Choix de conception (robustesse), sans effet sur les règles.
3. **Objectif du patient** saisi dans la section 1 (cahier des charges §4.3) ; le plan le rappelle en lecture.
   Dans le prototype, le champ se trouvait dans la section Plan. L'objectif est repris après suppression des
   espaces de début et de fin.
4. **Incapacité à 0 %** : affichée dans le résumé (le prototype l'omettait car `0` est « faux » en JavaScript).
5. **Repère terminé par un point** : pas de double point dans le résumé (« K.A. » et non « K.A.. »).
6. **Liens Consensus** : le paramètre de suivi `?utm_source=claude_desktop` a été retiré des URL (aucun suivi).
7. **Lombaires** : l'instrument Roland-Morris (×100/24), présent dans le prototype, est conservé en plus de l'ODI,
   bien que le cahier des charges ne cite que NDI / ODI / SPADI / QuickDASH.
8. **Nom du volet 6** : « Environnement et mode de vie » (libellé du prototype) ; le cahier des charges le
   décrit comme « Environnement, mode de vie, déterminants sociaux ». Nom court : « Environnement ».
9. **Libellés des boutons d'exemple** : « Marie, nuque (webinaire) », « K.A., lombalgie », « P.D., épaule »
   (cahier des charges) au lieu de « Karim » et « Paul » ; les données des cas sont inchangées.
10. **Radial sur écran étroit (≤ 520 px)** : la géométrie imposée (viewBox, centre, anneau, rayons) est conservée,
    mais à 360 px le SVG est réduit de moitié et des étiquettes latérales ancrées à droite/gauche sortiraient du
    cadre ou seraient illisibles (~7 px). En mode compact, les étiquettes des nœuds latéraux passent au-dessus
    (nœuds du haut) ou en dessous (nœuds du bas) du nœud, centrées, avec une police agrandie (~11 px effectifs à
    360 px). Vérifié automatiquement (Playwright) : aucune étiquette ne chevauche un nœud, le centre ou une autre
    étiquette, ni ne sort du viewBox, à 360, 430 et 1024 px. « Cognitivo-affectif » passe sur deux lignes.
11. **Curseurs** : un curseur non touché reste « non renseigné » (comme le prototype) ; un bouton « effacer »
    permet de revenir à cet état.
12. **Export PDF** : `jsPDF.save()` local (le prototype utilisait une API propre à son hôte). Pied de page
    « Aide au raisonnement clinique, non validée — page n/N ». Les guillemets français sont convertis sans espaces
    parasites.
13. **Niveau de preuve OBS** : le prototype n'avait pas de style pour cette puce ; elle a sa propre couleur, et
    chaque puce porte son libellé (jamais la couleur seule).
14. **Impression** : toutes les branches sont dépliées pendant l'impression puis restaurées.
15. Après un clic sur un nœud, une pastille de statut ou un axe prioritaire, le focus clavier est placé sur le
    titre de la branche ouverte (en plus du défilement).
16. Section « Limites » : texte du prototype inchangé ; titre « Limites et esprit critique ».

17. **Page hébergée sur claude.ai** : version en un seul fichier (`npm run build:single`). Le téléchargement
    direct y étant bloqué, l'export PDF passe par la capacité « downloads » (confirmation du navigateur) ;
    ailleurs, téléchargement jsPDF classique.
18. **En-tête** : emblème décoratif des six volets (aria-hidden), ombres légères sur les cartes, zones sûres
    des téléphones respectées (marges `env(safe-area-inset-*)`).

## Refonte « parcours patient » (v2)

19. **Deux temps** : le patient remplit seul un questionnaire guidé (une question par écran, environ
    10 minutes), puis le physio complète dans un espace dédié en 5 étapes (réponses du patient, sécurité,
    questionnaires, examen clinique, plan). Démarrage sur un cas vide ; les cas d'exemple ne sont plus proposés
    dans l'interface (ils restent dans le code pour les tests).
20. **Ce que le patient remplit** : zone, durée, début, douleur 0–10, les 6 repères de ressenti, santé
    (volet 4), travail et quotidien (volet 6), objectif. Les items de santé et de quotidien sont **reformulés en
    langage courant** (`src/data/patient.ts`) : choix de conception, à valider cliniquement. Les identifiants
    sont ceux du moteur ; les règles ne changent pas.
21. **Questionnaires sous licence** (STarT MSK, CSI, painDETECT, NDI, ODI, SPADI, QuickDASH) : toujours non
    reproduits. Le patient les remplit sur les versions officielles ; le physio saisit le score (étape 3).
22. **Drapeaux rouges, examen clinique, comportements observés, comorbidité mal contrôlée** : côté physio
    uniquement.
23. **Palette** : fond neutre clair, accent vert sauge (au lieu du bleu-sarcelle) ; couleurs des six volets
    inchangées. Limites et références repliées en bas du plan.
24. **Nouveau patient** : efface tout après une confirmation intégrée à la page.

## Questionnaires intégrés (version personnelle)

25. **Deux versions** : la version publique (site github.io) ne contient aucun questionnaire sous licence. La
    version personnelle (`npm run build:private`) inclut `private/questionnaires.ts`, **exclu de git**, qui
    contient les textes fournis par l'utilisateur (NDI, ODI, QuickDASH, TSK, painDETECT). Usage personnel
    uniquement ; ne jamais publier ce build.
26. **Règles de calcul** (publiques, `src/questionnaires/scoring.ts`, testées) : NDI et ODI en % sur les sections
    répondues (règle standard, non écrite sur les formulaires fournis) ; QuickDASH ((somme/n) − 1) × 25, non
    valable si plus d'une réponse manque (règle du formulaire) ; TSK somme 17–68, items 4, 8, 12, 16 inversés,
    valable seulement complet ; painDETECT 7 items + évolution + irradiation, valable seulement complet.
27. **Report automatique** : un score valable alimente le cas (incapacité avec son instrument, painDETECT) ; le
    physio peut le corriger à l'étape 3. Le TSK est affiché, sans effet sur les volets (option a ; un seuil
    d'allumage serait une décision clinique à valider).
28. **painDETECT** : traduction personnelle de la version anglaise, **non validée** ; l'avertissement s'affiche à
    côté du score. Les 3 échelles d'intensité et le schéma corporel (non cotés) ne sont pas repris : le patient
    a déjà donné sa douleur moyenne.
29. Textes transcrits fidèlement ; seules des fautes d'orthographe évidentes ont été corrigées, et « cochez /
    entourez » devient « touchez ».

## Technique

- Vite 8, React 18.3, TypeScript strict (`noUncheckedIndexedAccess`), Vitest 5, ESLint 10 (règle interdisant
  `dangerouslySetInnerHTML`, `no-alert`).
- Polices auto-hébergées via `@fontsource` ; jsPDF installé via npm et chargé dynamiquement.
- `netlify.toml` / `vercel.json` posent une CSP stricte (`default-src 'self'`), testée avec l'export PDF.
- Aucune référence n'a été ajoutée ; `PROPOSITIONS_REFS.md` n'a donc pas été créé.

## Vérifications effectuées

- 82 tests Vitest (moteur, cas limites, intégrité des références, résumé, sanitiseur, interface, parité).
- axe-core (WCAG 2.1 A/AA + bonnes pratiques) : 0 violation, clair et sombre, à 360, 430 et 1024 px.
- Aucune erreur ni aucun avertissement dans la console ; aucune requête hors du site ; pas de défilement horizontal.
- PDF généré, relu (texte extrait, accents corrects, pagination).
