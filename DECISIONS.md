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

25. **Deux versions** (voir aussi 37) : la version publique ne contient aucun questionnaire sous licence restrictive. La
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
30. **CSI-25, PCS, FABQ, PSEQ** ajoutés. CSI-25 (0–4 par item, total sur 100) alimente le volet 2 avec le seuil
    40 déjà prévu ; la partie B (diagnostics, non cotée) n'est pas reprise. PCS (sur 52, avec rumination,
    amplification, impuissance), FABQ (sur 96, avec activité physique /24 et travail /42) et PSEQ (sur 60) sont
    affichés sans effet sur les volets. Tous valables seulement s'ils sont complets (le formulaire FABQ précise
    qu'aucun ajustement n'existe). **FABQ proposé seulement pour les lombaires** : ses phrases parlent du dos.
    **PSEQ** : traduction personnelle de la version anglaise, non validée.
31. **STarT MSK** (version française PrePaC/Inselspital) : le patient le remplit, le physio voit l'intensité
    de la douleur et le nombre de « oui ». La **catégorie de risque reste saisie par le physio** : la feuille
    de cotation officielle n'a pas été fournie et n'a pas pu être vérifiée (sites Keele et PMC inaccessibles
    depuis l'environnement de développement). Aucune règle n'a été devinée.
32. **SPADI** : traduction personnelle de la version anglaise, non validée ; calcul selon le formulaire fourni
    (douleur /50, incapacité /80, total = moyenne des deux). Désactivé par défaut (le QuickDASH reste
    proposé pour l'épaule). Si plusieurs questionnaires alimentent la même mesure, le premier valable
    dans l'ordre de la liste l'emporte.
33. **Choix des questionnaires** par le physio (étape 3), conservé d'un patient à l'autre pendant la session,
    sans stockage : il revient aux réglages par défaut à la réouverture de la page.
34. **Volet 5 et questionnaires** (demande de l'utilisateur : « qu'il s'allume, mais pas aussi gros ») : TSK > 37
    et FABQ travail > 34 ajoutent une raison et portent le volet au plus à « à surveiller » ; ils ne changent
    ni le niveau « présent » ni le score de priorité. FABQ > 34 : Fritz & George 2002 (vérifié sur le résumé
    PubMed). TSK > 37 : seuil d'usage courant (De Vroey 2020 et autres), source originale non vérifiée.
    PCS, PSEQ et FABQ activité physique : affichés seulement (seuils non vérifiés).
35. **Questionnaires qui se recoupent, un seul par défaut** : peur du mouvement = TSK (nuque, épaule) ou FABQ
    (lombaires, cohérent avec les cibles FABQ des essais PDDM lombaires) ; incapacité de l'épaule =
    QuickDASH (SPADI désactivé par défaut).
36. **STarT MSK** : cotation fournie (questions 2 à 10 = 1 point, maximum 12, 0–4 faible, 5–8 moyen, 9–12
    élevé). La ligne de cotation de la question 1 (douleur, 0 à 3 points) manque : la catégorie n'est
    calculée que si elle est la même quel que soit ce score ; sinon le physio tranche (« faible ou moyen »).
37. **Version publique et licences** : à la demande de l'utilisateur, les questionnaires utilisables librement en
    clinique (NDI, QuickDASH, SPADI, CSI, TSK, PCS, FABQ, PSEQ) sont dans la version publique
    (`src/questionnaires/public.ts`). painDETECT (© Pfizer), STarT MSK (© Keele) et ODI (licence Mapi)
    restent dans la version personnelle uniquement (`private/`, exclu de git).
29. Textes transcrits fidèlement ; seules des fautes d'orthographe évidentes ont été corrigées, et « cochez /
    entourez » devient « touchez ».

### Bilan standardisé (plan 1/4, 24.11.2026)

38. **Route `#/bilan`** : le bilan standardisé est un écran séparé, isolé dans `src/bilan/`. L'app PDDM reste la
    page par défaut, inchangée (seul ajout : un préfixe facultatif pour le nom du PDF).
39. **Contenu provisoire** : les sections, champs, pastilles et règles de l'épaule sont des exemples de mécanique,
    tous marqués `provisional: true` (« Source provisoire » à l'écran). Aucune propriété diagnostique chiffrée tant
    qu'il n'y a pas de source validée ; le test d'intégrité le vérifie. La règle de base propose le SPADI
    (questionnaire d'épaule par défaut, décision du 24.11.2026). Le contenu validé viendra de la revue de la
    littérature.
40. **Coffre local chiffré par PIN** : chaque saisie est enregistrée 500 ms après la dernière frappe, dans
    IndexedDB, en AES-GCM 256 avec une clé dérivée du PIN (PBKDF2-SHA256, 600 000 itérations, sel aléatoire de
    16 octets). Même la liste « Mes bilans » est chiffrée : en clair, il ne reste que le sel et un vérificateur.
    Aucun `localStorage`. Un PIN oublié rend les bilans irrécupérables, et c'est écrit à la création du PIN.
    Verrouillage automatique après 15 minutes d'inactivité.
41. **Identité du patient** : nom, prénom et date de naissance figurent dans le PDF et dans « Mes bilans »
    (chiffrés), mais jamais dans les blocs SYSmeta. Les plans suivants l'excluront aussi de l'IA et de
    « Copier pour Claude ».

### Accueil patient, onglets, couleurs (plan 1b, 25.11.2026)

42. **Onglets fermés au départ** (demande de l'utilisateur) : chaque section du bilan est un onglet repliable,
    fermé à l'ouverture ; un onglet ouvert le reste jusqu'à ce qu'on le referme. Le titre affiche l'avancement
    (champs remplis / champs). « Ajouter » sur une suggestion ouvre l'onglet concerné.
43. **Palette de l'outil de bilan** (demande de l'utilisateur : blanc, beige/brun, bleu) : fond beige, cartes
    blanches, texte brun foncé, actions en bleu, avec une version sombre. Contraste du texte ≥ 4,5:1, vérifié par
    un test. L'app PDDM garde ses couleurs.
44. **Accueil de 5 minutes** : rempli par le patient sur la tablette en mode verrouillé (une question par écran,
    vouvoiement), ou par le physio en séance si le patient est en retard (« Passer l'accueil »). Jamais envoyé par
    QR code. La réponse d'origine du patient est conservée quand le physio la corrige (« patient : … »). Aucun
    score combiné (PSFS et dépistage question par question). Questions et crayons provisoires, à valider. Le mode
    patient ne montre que l'accueil ; sortir demande le PIN ; l'adresse, le bouton Précédent et les autres
    onglets ne permettent pas d'en sortir. Le reste (changer d'application) relève de l'Accès guidé (iPad) ou de
    l'épinglage d'écran (Android), rappelé à chaque lancement : s'en souvenir exigerait un stockage en clair.
45. **Body chart à dessiner** (souris, doigt, stylet) : un crayon pour le patient, quatre pour le physio, gomme et
    annulation. Une silhouette au contour lisse, gris clair et trait gris-bleu (dessin original dans le style du
    modèle fourni par l'utilisateur le 25.11.2026, qui n'est pas repris lui-même : probable image de banque
    d'images), découpée en régions invisibles (de face, la droite du patient est à
    gauche) donne la liste des régions par type de symptôme dans SYSmeta et sert aux règles ; le PDF contient le
    dessin.

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
