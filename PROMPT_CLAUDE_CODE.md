# PROMPT CLAUDE CODE — Application web « Profil des moteurs de douleur » (épaule, lombaire, cervical)

> Colle ce prompt tel quel dans Claude Code, à la racine d'un dossier vide.
> Avant de lancer : crée `./reference/` et mets-y le fichier `prototype.html` (le prototype fonctionnel fourni avec ce prompt). Il sert de **référence pour les données, les règles et les textes**. Tu dois le lire en entier avant d'écrire du code.

---

## 0. Rôle et mode de travail

Tu es un développeur front-end senior, doublé d'un rigueur de chercheur en rééducation musculo-squelettique. Tu construis, **à partir d'un projet vierge**, une application web statique en **français**, destinée à des **physiothérapeutes** (utilisateur principal : Yassine Bensaid, physiothérapeute à Lausanne, spécialisé épaule et douleur chronique).

Règles de travail :
1. Commence par lire `./reference/prototype.html` (données `REFS`, `REGION`, `D2`, `D4`, `SL`, `D5B`, `D6`, `EX` ; fonctions `analyze`, `targets`, `interventions`, rendu radial/arbre, export). C'est la source de vérité fonctionnelle. Tu la **portes dans une architecture propre**, tu ne la réinventes pas.
2. Annonce un plan court, puis exécute-le par étapes (voir §11). Après chaque étape : lance les tests, lance le build, corrige.
3. Ne demande pas de validation sauf blocage réel. Prends la décision raisonnable, note-la dans `DECISIONS.md`.
4. Ne jamais inventer une référence, un seuil ou un chiffre clinique. Toute valeur clinique vient du prototype ou est marquée explicitement comme « choix de conception ».

---

## 1. Objectif produit

Un outil d'aide au raisonnement clinique qui, pour **une région** (cervicale, lombaire, épaule) :
1. recueille le contexte (durée, début, risque STarT MSK saisi par le clinicien, douleur 0–10, incapacité en %, objectif du patient) ;
2. dépiste les **drapeaux rouges** (orientation urgente vs avis médical rapide) ;
3. évalue **six volets** (voir §2) à partir de cases à cocher, de scores de questionnaires saisis et de curseurs 0–10 ;
4. calcule pour chaque volet un niveau (**Sans signal / À surveiller / Présent**) et un sous-volet (**A**, **B** ou **A+B**) ;
5. affiche à la fin un **diagramme interactif et repliable** des volets sur lesquels travailler, avec **cibles de traitement claires** (valeur de départ → objectif), interventions avec **niveau de preuve** et références citées, critères d'orientation ;
6. exporte un résumé (PDF + copie texte) ;
7. n'enregistre **aucune donnée** (pas de localStorage, pas de backend, pas d'analytics).

Ce n'est **pas** un dispositif médical, **pas** un outil de diagnostic. Un bandeau « Aide au raisonnement clinique, non validée » est visible en permanence (pied de page + export).

---

## 2. Modèle clinique (PDDM / MGVDI)

Modèle de gestion des facteurs de douleur et d'incapacité (*Pain and Disability Drivers Management*), six volets :

| # | Volet | Nom court |
|---|-------|-----------|
| 1 | Nociceptif | Nociceptif |
| 2 | Nociplastique | Nociplastique |
| 3 | Neuropathique | Neuropathique |
| 4 | Comorbidités | Comorbidités |
| 5 | Cognitivo-affectif (A = cognitions/émotions, B = comportements) | Cognitivo-affectif |
| 6 | Environnement, mode de vie, déterminants sociaux | Environnement |

- **Sous-volet A** : pris en charge par le physiothérapeute. **Sous-volet B** : complexe → orientation / travail interdisciplinaire.
- Niveau de validation à afficher honnêtement : **cervical** = contenu validé par Delphi (Gérard 2025) ; **lombaire** = essais pilotes non randomisés (Longtin 2021/2023) ; **épaule** = **adaptation non validée** (appuyée par De Baets 2025, guide de phénotypage). Ce libellé doit apparaître dans le badge sous le titre (`REGION[x].model`) et dans la section « Limites ».

---

## 3. Stack et architecture

- **Vite + React 18 + TypeScript (strict)**. Pas de framework CSS : **CSS Modules ou un seul `styles.css` avec variables CSS** (voir §8).
- **Tests : Vitest** (+ React Testing Library pour 2–3 tests d'interaction). **Lint : ESLint + Prettier.**
- **PDF : jsPDF** installé via npm (pas de CDN), import dynamique au clic pour alléger le bundle.
- **Pas de lib de graphique** : le radial est un **SVG écrit à la main** (6 nœuds autour d'un centre).
- Polices : Bricolage Grotesque (titres) + Public Sans (texte), **auto-hébergées** via `@fontsource` (pas de Google Fonts).
- Sortie : site **100 % statique** (`vite build`), déployable sur Vercel / Netlify / GitHub Pages. Ajoute un `README.md` (lancement, build, déploiement) et une GitHub Action de build + tests.

Arborescence cible :

```
src/
  data/            # données cliniques, 100 % typées, aucune logique
    refs.ts        # REFS (clé, titre, url|null) + RN (clé → numéro)
    domains.ts     # DOM (id, nom, court, variables couleur), DESC
    regions.ts     # REGION: cervical | lumbar | shoulder (flags, d1, d3, instruments, modèle)
    items.ts       # D2, D4, D4B, SL, D5B, D6
    examples.ts    # cas d'exemple (3) : Marie (cervical), K.A. (lombaire), P.D. (épaule)
    text.ts        # libellés FR : niveaux, niveaux de preuve, limites
  engine/          # logique pure, SANS React ni DOM
    analyze.ts     # analyze(state) → { A, order, flags, csiPos, cut, startRisk }
    targets.ts     # targets(domainId, state, analysis) → string[]
    interventions.ts # interventions(domainId, state, analysis) → Intervention[]
    summary.ts     # summaryLines(state) → lignes typées ; toText(lines)
    types.ts
  components/      # Hero, StatusBar, CaseForm, RedFlags, DomainForms, PlanSection,
                   # RadialDiagram, PriorityList, DomainTree, ExportBar, LimitsSection, References
  pdf/exportPdf.ts # génération jsPDF, sanitiser ASCII, pagination
  state/           # useReducer unique (AppState), actions typées
  styles/
tests/
  engine.analyze.test.ts  engine.targets.test.ts  summary.test.ts  ui.smoke.test.tsx
```

Principe : **le moteur (`engine/`) est une fonction pure** testée à 100 % sur les règles du §6 ; l'UI ne fait qu'afficher son résultat.

---

## 4. Contenu de l'application (sections, dans l'ordre)

1. **Hero** : titre « Profil des moteurs de douleur », sous-titre, pastille du modèle (change selon la région), avertissement non-validé.
2. **Barre de statut collante** : 6 pastilles (numéro + nom court) colorées selon le niveau, cliquables (scroll vers la branche du diagramme), + lien « Voir le plan ↓ ».
3. **Section 1 — Le cas** : sélecteur de région (3 boutons, `aria-pressed`), boutons « Charger un exemple » (3 cas) et « Réinitialiser » ; champs : repère patient (initiales, jamais de nom complet — placeholder explicite), durée (`<6 sem` / `6 sem–3 mois` / `>3 mois`), début (non traumatique / traumatique / post-opératoire), STarT MSK (non passé / faible / moyen / élevé — **le clinicien saisit la catégorie officielle ; ne reproduis jamais les items**), douleur 0–10, instrument d'incapacité (NDI / ODI / SPADI / QuickDASH selon région) + score en % avec lecture de gravité sous le champ (voir `disBand`), objectif du patient (texte libre, réutilisé dans les cibles).
4. **Section 2 — Sécurité (drapeaux rouges)** : cases par région (`REGION[r].flags`, type `u` = orienter sans attendre, `m` = avis médical rapide). Alerte rouge (u) ou orange (m) répétée en tête de la section Plan.
5. **Section 3 — Évaluation par volet** : 6 `<details>` colorés, chacun avec sa description, ses cases, et un tag de niveau mis à jour en direct. Volet 2 : choix CSI-9 (seuil 20) ou CSI-25 (seuil 40) + score. Volet 3 : score painDETECT (−1 à 38 ; <13 improbable, 13–18 ambigu, ≥19 probable). Volet 5 : 6 curseurs 0–10 « repères maison non validés » + cases comportements (B). Volet 6 : cases étiquetées A/B.
6. **Section 4 — Plan : volets à travailler** (**cœur du produit**, voir §7).
7. **Section 5 — Export** : bouton PDF, bouton « Copier le résumé », zone de message `aria-live`.
8. **Section 6 — Limites et esprit critique** (texte du prototype `renderStatic` → `#crit`, à conserver fidèlement).
9. **Section 7 — Références** : liste numérotée ancrée (`#ref-<clé>`), liens externes `rel="noopener"`.
10. **Pied de page** : avertissement, mention « aucune donnée enregistrée ».

Au démarrage, **charger l'exemple cervical (Marie)**.

---

## 5. Données : à porter depuis le prototype

Reprends **tel quel** (texte français, clés, structure) depuis `prototype.html` : `REFS` (~48 références), `DOM`, `DESC`, `REGION`, `D2`, `D4`, `D4B`, `SL`, `D5B`, `D6`, `EX`. Tape-les en TypeScript :

```ts
type Level = 0 | 1 | 2;               // sans signal / à surveiller / présent
type Sub = '' | 'A' | 'B' | 'A+B';
type Region = 'cervical' | 'lumbar' | 'shoulder';
type Evidence = 'CPG' | 'RCT' | 'OBS' | 'EXP' | 'NR';
interface Intervention { t: string; d: string; ev: Evidence; r: string[] }   // r = clés de REFS
interface DomainResult { level: Level; sub: Sub; reasons: string[]; score: number; refer: string[]; note?: string }
```

Niveaux de preuve (puces colorées + libellé, jamais la couleur seule) :
- `CPG` Guideline · `RCT` Essais ou revues · `OBS` Étude observationnelle · `EXP` Avis d'experts · `NR` Non revu ici.

Ajoute un test qui vérifie : toute clé citée dans `interventions()` / `limits` existe dans `REFS` ; aucune clé `REFS` n'est dupliquée ; chaque URL est `https://` ou `null`.

---

## 6. Règles du moteur `analyze()` (à reproduire exactement, puis tester)

Entrées : région, durée, début, STarT, douleur, instrument, incapacité, type CSI + score, painDETECT, `chk` (map id→bool), `sl` (6 curseurs, `null` si non touché), objectif.
`startRisk = STarT ∈ {medium, high}`.

**Volet 1 — Nociceptif** : marqueurs `mk` cochés (items `d1` de type `mk`), préférence directionnelle `a_dp`, absence d'amélioration `a_noimp`. Niveau 2 si au moins un des trois ; sub = `A+B` si `a_noimp`, sinon `A`. `a_noimp` ajoute une consigne d'orientation (réévaluer le diagnostic, avis médical). Score = nb marqueurs + (dp ? 2 : 0).

**Volet 2 — Nociplastique** : seuil CSI = 20 (CSI-9) ou 40 (CSI-25) ; `csiPos = csi ≥ seuil`. `possible = durée>3 mois ET régional ET dispersé` ; `probable = possible ET all (douleur non expliquée)`. Niveau 2 si `probable` OU (csiPos ET au moins un de régional/dispersé/all) ; niveau 1 si `csiPos` OU `possible` OU (≥ 2 parmi régional, dispersé, all, sensibilité) ; sinon 0. sub = `A+B` si niveau 2 ET (STarT élevé OU détresse ≥ 7 OU ≥ 3 comorbidités), sinon `A`. Note : « nociplastique probable / possible » (à confirmer avec la grille IASP 2021).

**Volet 3 — Neuropathique** : `pdHigh = pd ≥ 19`, `pdAmb = 13 ≤ pd < 19`. Niveau 2 si déficit objectif OU pdHigh OU (radiculaire ET ≥ 2 tests positifs) OU signe B (myélopathie / déficit progressif) ; niveau 1 si pdAmb OU radiculaire OU ≥ 1 test OU brûlure ; sinon 0. sub = `B` si signe B, `A+B` si déficit, sinon `A`. Orientation : signe B → avis médical rapide ; déficit → réévaluer à chaque séance.

**Volet 4 — Comorbidités** : niveau 2 dès qu'une comorbidité `D4` est cochée ; sub `A+B` si comorbidité mal contrôlée (`co_unc`), sinon `A` ; `co_unc` → orientation médecin traitant.

**Volet 5 — Cognitivo-affectif** : drapeaux issus des curseurs : attentes ≤ 4, auto-efficacité ≤ 4, peur ≥ 6, inquiétude ≥ 6, croyance structurelle ≥ 6, détresse ≥ 6. `key` = nb de drapeaux parmi attentes/auto-efficacité ; `nb` = nb de comportements B cochés ; `nf` = nb de drapeaux.
- **Épaule** (conservateur) : niveau 2 si `key ≥ 1` OU `nb ≥ 2` ; niveau 1 si `nf ≥ 1` OU `nb ≥ 1`. Note spécifique : seuls attentes et auto-efficacité ressortent de façon fiable.
- **Cervical / lombaire** : niveau 2 si `nf ≥ 2` OU (`nf ≥ 1` ET (`startRisk` OU `nb ≥ 1`)) ; niveau 1 si `nf = 1` OU `nb ≥ 1`.
- sub = `A+B` si `nf ≥ 1` ET `nb ≥ 1`, `B` si `nb ≥ 1` seul, sinon `A`. Orientation si détresse ≥ 8 ou comorbidité « humeur ».

**Volet 6 — Environnement** : `ea` = items A cochés, `eb` = items B cochés. Niveau 2 si (ea+eb ≥ 2) OU eb ≥ 1 ; niveau 1 si ea = 1. sub = `A+B` si eb et ea, `B` si eb seul, sinon `A`. eb → orientation (médecin du travail, case manager, assistant social).

**Ordre de priorité** : tri par niveau décroissant, puis score décroissant, puis numéro de volet croissant. Les **3 premiers volets de niveau 2** reçoivent un badge de rang dans le radial.

Précision importante : **ces seuils d'allumage sont des choix de conception**, pas des seuils publiés (seuls CSI-9 ≥ 20 et les catégories painDETECT viennent d'outils publiés). Ce point doit apparaître dans la section Limites et dans le `README`.

Résultats attendus sur les exemples (tests de non-régression obligatoires) :
- Cervical « Marie » : volets 1, 4, 5 (A+B), 6 allumés ; **2 et 3 non allumés** ; ordre = 5,1,6,4,2,3.
- Lombaire « K.A. » : 1, 2 (A+B), 4, 5 (A+B), 6 (A+B) allumés ; 3 « à surveiller » ; ordre = 5,2,6,4,1,3.
- Épaule « P.D. » : 1, 4, 5, 6 allumés ; 2 et 3 non allumés ; ordre = 5,6,1,4,2,3.

---

## 7. Section Plan — le diagramme interactif et repliable (priorité n°1)

**a) Radial SVG** (6 nœuds autour d'un centre qui affiche la région et le STarT) :
- `viewBox="-70 -30 660 580"`, centre (260, 262), rayon d'anneau 166, rayon des nœuds 44, un nœud toutes les 60° en partant du haut.
- Style de nœud par niveau : **présent** = disque plein couleur du volet ; **à surveiller** = disque teinté + bordure **en tirets** ; **sans signal** = disque neutre. Le sous-volet (A / B / A+B) s'écrit sous le numéro.
- **Étiquettes** : nœuds haut/bas → centrées au-dessus/en dessous ; nœuds latéraux → ancrées à gauche/droite du nœud (jamais chevauchement avec le nœud ; vérifier sur 360 px de large).
- Pastille de rang (1–3) en haut à droite des nœuds prioritaires.
- Chaque nœud : `tabindex=0`, `role="button"`, `aria-label` = « {volet} : {niveau} », activation clic / Entrée / Espace → **ouvre la branche correspondante dans l'arbre et y scrolle** (`scroll-behavior` désactivé si `prefers-reduced-motion`).
- Légende : Présent / À surveiller / Sans signal (forme + libellé, pas que la couleur).

**b) Liste « Axes prioritaires »** : volets de niveau 2 dans l'ordre de priorité, avec numéro de rang, nom, tag de sous-volet et 2 raisons principales ; cliquable.

**c) Arbre repliable** : un `<details>` par volet, ordre de priorité. Boutons **« Tout déplier »**, **« Tout replier »**, case **« Masquer les volets sans signal »**. L'état ouvert/fermé de chaque branche est **conservé** lors des re-rendus (objet `OPEN`) ; par défaut, les 2 premiers volets prioritaires sont ouverts.
Contenu d'une branche allumée :
1. *Pourquoi ce volet est allumé / à surveiller* : liste des raisons (ex. « CSI-9 = 24 (seuil retenu : 20) ») + note éventuelle.
2. **Cibles de traitement** (à négocier avec le patient) : chaque cible est une phrase **chiffrée « départ → objectif »**, générée par `targets()` — ex. « Douleur : réduction d'au moins 20 % (6/10 vers 4,8/10 ou moins) », « Incapacité (NDI) : réduction ≥ 20 % par rapport à 46 % ; PGIC ≥ 3 », « Attentes de récupération : 3/10 vers 6/10 ou plus », « Peur du mouvement : 7/10 vers 4/10 ou moins ; FABQ −4 pts (activité) / −7 pts (travail) = changement significatif », « painDETECT : X vers moins de 13 », objectif du patient repris mot pour mot.
3. **Interventions** : titre, puce de niveau de preuve, exposants de références cliquables, description.
4. **Orienter si** : encadrés d'orientation.
Branche « sans signal » : une phrase, sans cibles ni interventions.

Les textes d'interventions et de cibles sont dans `interventions()` et `targets()` du prototype : **porte-les à l'identique** (ils sont déjà reliés aux références).

---

## 8. Design et accessibilité

Esthétique : sobre, clinique, **élégante** — cartes blanches sur fond gris-bleu clair, une teinte d'accent sarcelle, **une couleur par volet**. Pas de dégradés criards, pas de gabarit générique.

Tokens (mode clair en `:root`, surcharges sombres dans `@media (prefers-color-scheme: dark)`) :
- Clair : `--bg #F2F5F8`, `--surface #FFFFFF`, `--ink #12212E`, `--muted #556575`, `--line #D5DDE5`, `--accent #0B6E7F`, `--accent-ink #FFFFFF`.
- Volets (plein / teinte) clair : 1 `#1D4ED8`/`#E6EDFD`, 2 `#6D28D9`/`#EEE8FB`, 3 `#B83A0B`/`#FCE9DF`, 4 `#0F766E`/`#DCF2EF`, 5 `#BE185D`/`#FBE5EE`, 6 `#8A4B08`/`#F6EBD9`.
- Sombre : `--bg #0E1923`, `--surface #15232F`, `--ink #E6EDF3`, `--muted #9DAFBE`, `--line #2A3C4B`, `--accent #55B8C9`, `--accent-ink #06222A` ; volets 1 `#8BAAFF`/`#1B2A4A`, 2 `#BEA5FF`/`#2C2347`, 3 `#FF9F72`/`#432519`, 4 `#52D6C4`/`#12322E`, 5 `#FF92BA`/`#43203A`, 6 `#E4AE66`/`#3A2D17`.

Exigences :
- **Mobile d'abord** (test à 360 px et 430 px), grille 2–3 colonnes qui passe à 1 colonne.
- Contraste **WCAG AA** (vérifier clair et sombre), focus visible sur tout élément interactif, navigation clavier complète, `aria-live` pour les messages d'export, `prefers-reduced-motion` respecté, aucune information portée par la couleur seule.
- Texte utilisateur toujours inséré via React (jamais `dangerouslySetInnerHTML`).
- `lang="fr"`, titres hiérarchisés, `<details>/<summary>` natifs pour les branches.

---

## 9. Export

- **Résumé** : `summaryLines()` produit des lignes typées (`t` titre, `p` paragraphe, `w` alerte, `h` titre de volet, `s` sous-titre, `li` puce, `n` note). Contenu : région, date (`fr-CH`), repère, durée, STarT, douleur, incapacité, drapeaux, objectif du patient, puis pour chaque volet allumé (par priorité) : raisons, cibles, interventions avec `[niveau de preuve]` et numéros de références, critères d'orientation ; section Sources (références réellement citées) ; note finale « Aide au raisonnement clinique, non validée… ».
- **PDF (jsPDF, A4)** : sanitiseur ASCII (remplacer ’ « » → ≥ ≤ – − × ± œ … ; supprimer les caractères hors Latin-1), pagination automatique, pied de page « page n/N », titres de volets en sarcelle, alertes en rouge. Nom de fichier `profil-douleur-AAAA-MM-JJ.pdf`. Gérer l'échec proprement (message dans la zone `aria-live`, jamais d'exception non gérée).
- **Copier** : `navigator.clipboard.writeText(toText(lines))` avec message de succès ou de refus.
- Aucun nom complet de patient dans l'export : le champ « repère » est libre mais le placeholder demande des initiales.

---

## 10. Règles d'honnêteté scientifique (non négociables)

1. **Ne jamais reproduire les items** de STarT MSK, CSI, painDETECT, NDI, ODI, SPADI, QuickDASH, FABQ, TSK, PCS, PSEQ (licences). L'utilisateur **saisit des scores** ou des catégories ; les 6 curseurs 0–10 sont des repères « maison » à libeller comme **non validés**.
2. Toujours afficher le **niveau de preuve** d'une intervention et ses références ; ne jamais présenter un avis d'experts (`EXP`) ou une pratique courante (`NR`) comme une recommandation de guideline.
3. La section **Limites** doit rester visible et fidèle : prédire n'est pas améliorer (soins stratifiés : résultats contrastés) ; cervical = validation de contenu seulement ; lombaire = pilotes non randomisés avec 29–43 % de perdus de vue ; épaule = adaptation non validée ; drapeaux rouges isolés = faible valeur (antécédent de cancer le plus fiable, 64 % des tumeurs vertébrales d'une grande série sans drapeau) ; seuils d'allumage = choix de conception.
4. Les références proviennent de titres et résumés : ajouter dans le README et en section Références la mention « à vérifier dans les textes complets avant usage clinique ». **Ne rajoute aucune référence** que tu ne peux pas vérifier ; si tu veux en proposer, mets-les dans `PROPOSITIONS_REFS.md` avec DOI, sans les brancher à l'interface.
5. Ton rédactionnel : français clair, phrases courtes, pas de jargon inutile, pas de promesse thérapeutique.

---

## 11. Plan d'exécution (étapes ; à la fin de chacune : `npm test` + `npm run build` + `npm run lint`)

1. **Initialisation** : Vite + React + TS strict, ESLint/Prettier, Vitest, `@fontsource`, `README`, `DECISIONS.md`, CI.
2. **Données typées** (`src/data/*`) portées du prototype + test d'intégrité des références.
3. **Moteur pur** (`src/engine/*`) + **tests** (les 3 exemples du §6, cas limites : tous champs vides, CSI exactement au seuil, painDETECT 12/13/18/19, épaule vs autres régions pour le volet 5, tri d'égalité).
4. **État + formulaires** (sections 1 à 3), curseurs, lecture de gravité NDI/ODI, exemples et réinitialisation.
5. **Plan** : radial SVG, liste prioritaire, arbre repliable, boutons déplier/replier, masquer les vides, barre de statut.
6. **Export** (résumé, PDF, copie) + tests du résumé.
7. **Limites, références, pied de page**, thème clair/sombre, polish visuel.
8. **Vérification finale** : audit accessibilité (axe ou Lighthouse), tests clavier, rendu à 360/430/1024 px, clair et sombre, impression propre, aucun avertissement console, taille du bundle raisonnable (jsPDF en import dynamique).

---

## 12. Critères d'acceptation

- [ ] `npm run build` et `npm test` passent ; aucun warning TypeScript ni ESLint.
- [ ] Les 3 exemples donnent exactement les niveaux et l'ordre du §6.
- [ ] Cliquer un nœud du radial ouvre et scrolle vers la bonne branche ; Tout déplier / Tout replier / Masquer les vides fonctionnent ; l'état des branches survit aux changements de formulaire.
- [ ] Chaque volet allumé affiche des **cibles chiffrées** (départ → objectif), des interventions avec puce de preuve et références cliquables, et des critères d'orientation.
- [ ] Changer de région remet à zéro les cases propres à la région et met à jour modèle, drapeaux, instruments et textes.
- [ ] PDF généré et lisible (accents corrects après sanitisation, pagination, pied de page) ; copie du résumé OK ; échecs gérés.
- [ ] Aucune donnée persistée ; aucune requête réseau hors chargement du site.
- [ ] Mobile 360 px sans chevauchement (étiquettes du radial incluses) ; contraste AA clair et sombre ; navigation clavier complète.
- [ ] Section Limites et mentions « non validé » présentes ; aucun item de questionnaire sous licence reproduit.

## 13. À ne pas faire

- Pas de backend, de base de données, de compte utilisateur, de tracking.
- Pas de nouveaux seuils cliniques, de nouvelles références ni de nouveaux textes thérapeutiques non présents dans le prototype sans les marquer « choix de conception » ou les mettre en proposition.
- Pas de `dangerouslySetInnerHTML`, pas de CDN pour le code ou les polices, pas de `alert/confirm/prompt`.
- Pas de gros refactor cosmétique qui change les règles du moteur : toute modification de règle passe par `DECISIONS.md` + test.

---

Quand tout est terminé : donne-moi (1) la commande pour lancer en local, (2) la commande de build, (3) la marche à suivre pour déployer sur Netlify ou Vercel, (4) la liste des écarts éventuels par rapport au prototype.
