# Accueil patient, onglets repliables et couleurs — plan d'implémentation 1b

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au bilan des onglets fermés au départ avec compteur d'avancement, la palette blanc/beige/brun/bleu, et un accueil de 5 minutes : rempli par le patient en mode verrouillé sur la tablette, ou par le physio en séance, avec un body chart à dessiner.

**Architecture:** Les questions de l'accueil, les crayons et les règles restent dans `src/bilan/content/`. La géométrie du body chart (silhouette, régions invisibles) est un module pur, `src/bilan/bodychart/geometry.ts`, partagé par l'écran (SVG), le PDF (jsPDF) et les règles. L'état de l'accueil s'ajoute à `BilanState` ; les bilans enregistrés au plan 1 sont complétés au chargement par `normalizeBilan`. Le mode patient est un écran de `BilanRoot`, et un garde en mémoire empêche d'en sortir sans PIN.

**Tech Stack:** Vite, React 18, TypeScript strict, Vitest et Testing Library, jsPDF (existants). Aucune nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-25-accueil-onglets-couleurs-design.md` (complète `docs/superpowers/specs/2026-11-24-bilan-standardise-design.md`)

## Global Constraints

- Toutes les contraintes globales du plan 1 (`docs/superpowers/plans/2026-11-24-bilan-socle-epaule.md`) restent valables : contenu modulable dans `src/bilan/content/*.ts`, `source: { ref, added }` sur chaque élément, tout le contenu `provisional: true`, aucun chiffre clinique inventé, rien de coché automatiquement, stockage IndexedDB uniquement chiffré, aucun `localStorage` ni `sessionStorage`, identité jamais dans SYSmeta, PDDM et `tests/parity.test.ts` intacts, `npm run lint` sans avertissement, `npm run typecheck` et `npm test` verts avant chaque commit.
- Textes du patient au **vouvoiement**, en langage courant ; écran du clinicien au tutoiement.
- Statuts de l'accueil, mots exacts : « non fait », « rempli par le patient », « rempli par le physio en séance ».
- Body chart : on dessine au doigt, au stylet **ou à la souris**. Le patient a **un seul crayon** (`douleur`) ; le physio a plusieurs crayons (provisoires : douleur, irradiation, fourmillements, engourdissement), une gomme et « Annuler le dernier trait ».
- PSFS et dépistage : valeurs question par question, **aucune moyenne ni score combiné**.
- Une réponse corrigée par le physio garde la réponse d'origine du patient, affichée « patient : <réponse> ».
- L'accueil n'est **jamais** envoyé par QR code.
- Palette appliquée à l'outil de bilan seulement (pas à l'app PDDM) ; contraste texte ≥ 4,5:1 en clair et en sombre.
- Aucune requête réseau.

## Review Focus

1. **Le patient tente de sortir du mode patient** (bouton Précédent du navigateur, changement d'adresse `#/`, rechargement, autre onglet déjà ouvert) : il ne voit jamais le bilan, « Mes bilans » ni l'app PDDM sans le PIN. → tests dans la tâche 8.
2. **Bilan enregistré au plan 1, sans accueil** : il s'ouvre sans planter, avec l'accueil « non fait ». → test dans la tâche 5.
3. **Dessin à la souris et traits minuscules** (un simple clic, un trait d'un seul point, un trait qui sort de la silhouette) : pas de plantage ; un clic seul n'enregistre pas de trait ; les points hors silhouette n'ajoutent aucune région. → tests dans les tâches 4 et 6.
4. **Accueil commencé puis interrompu** (le physio saisit son PIN au milieu) : les réponses déjà données sont gardées comme réponses du patient, et le statut devient « rempli par le physio en séance ». → test dans la tâche 8.
5. **Côtés du body chart** : sur la vue de face, le côté droit du patient est à gauche de l'image ; une région dessinée à gauche de l'image de face est « droite ». → test dans la tâche 4.

---

### Task 1: Onglets fermés au départ, avec compteur

**Files:**
- Create: `src/bilan/engine/progress.ts`
- Modify: `src/bilan/ui/BilanApp.tsx` (le `<details>` des sections n'a plus `open` ; le titre affiche le compteur)
- Modify: `src/bilan/ui/SuggestionsPanel.tsx` (`goTo` ouvre le `<details>` parent avant de placer le focus)
- Modify: `src/styles/styles.css` (titre d'onglet, chevron, compteur)
- Test: `tests/bilan.progress.test.ts`, `tests/bilan.ui.test.tsx` (adapter et compléter)

**Interfaces:**
- Produces : `sectionProgress(sec: SectionDef, s: BilanState): { filled: number; total: number }` dans `progress.ts`. `total` est le nombre de champs de la section (notes comprises). Un champ compte comme rempli si : `number` → au moins un côté (ou la clé seule) dans `s.nums` ; `choice` → dans `choices` ; `test` → dans `tests` ; `chips` → au moins une pastille cochée ; `notes` → texte non vide après `trim()`.
- Le `<summary>` contient `<span class="bilan-sec-title">{title}</span>` puis `<span class="bilan-sec-count" aria-label="{filled} champs remplis sur {total}">{filled}/{total}</span>`.

- [ ] **Step 1: Write the failing tests**
  - `bilan.progress.test.ts` : sur `SHOULDER`, la section `mobilite` vide donne `{ filled: 0, total: 9 }` ; avec `nums['mobilite.abd_a.G']=170` et une note `mobilite.notes='x'`, on obtient `{ filled: 2, total: 9 }` ; une note `'   '` ne compte pas.
  - `bilan.ui.test.tsx` : le test « 8 sections dans l'ordre » lit `.bilan-sec-title` au lieu de `summary.textContent` ; nouveau test : toutes les `details.bilan-sec` ont `open === false` au rendu ; après un clic sur le résumé « Force », il est `open`, et il le reste quand on ouvre « Mobilité » ; le compteur de « Tests spécifiques » passe de `0/10` à `1/10` après « positif » sur Full can.
  - Nouveau test : avec toutes les sections fermées, « Ajouter ER lag sign » ouvre la section « Tests spécifiques » (`open === true`) et place le focus sur le groupe « ER lag sign ».
  - Les tests existants qui interagissent avec des champs dans des sections fermées restent valables : `fireEvent` n'exige pas que l'élément soit visible. Ne pas les modifier sauf s'ils échouent pour cette raison.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.progress.test.ts tests/bilan.ui.test.tsx`. Attendu : FAIL (module introuvable, sections ouvertes).
- [ ] **Step 3: Implement.** `goTo` : `el.closest('details')` → `open = true` avant `focus`.
- [ ] **Step 4: Run** le même test. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): onglets fermés au départ avec compteur d'avancement`.

### Task 2: Palette blanc, beige/brun et bleu

**Files:**
- Modify: `src/styles/styles.css` : une classe `.bilan-theme` qui redéfinit les variables existantes (`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--soft`, `--accent`, `--accent-ink`, `--accent-soft`), en clair, puis en sombre sous `@media (prefers-color-scheme: dark)` avec `:root:not([data-theme='light']) .bilan-theme`. `.bilan-theme` a `min-height: 100vh` et `background: var(--bg)`.
- Modify: `src/bilan/ui/BilanApp.tsx`, `LockScreen.tsx`, `BilanList.tsx` : ajouter `bilan-theme` à leur élément racine.
- Test: `tests/bilan.theme.test.ts`

Valeurs (clair) : `--bg: #f5efe6` (beige), `--surface: #ffffff`, `--ink: #3b2a20` (brun foncé), `--muted: #6e5a4b`, `--line: #e4d8c8`, `--soft: #efe6d8`, `--accent: #1f5fa8` (bleu), `--accent-ink: #ffffff`, `--accent-soft: #e3edf8`.
Valeurs (sombre) : `--bg: #1b1612`, `--surface: #241d18`, `--ink: #f1e8dd`, `--muted: #bfae9c`, `--line: #3a2f27`, `--soft: #2e251f`, `--accent: #7fb0f0`, `--accent-ink: #0d1b2e`, `--accent-soft: #1d2a3b`.
Ces valeurs sont un point de départ : Yass les valide sur captures à la tâche 8 ; ajuster seulement les valeurs, jamais la structure.

- [ ] **Step 1: Write the failing test** (`bilan.theme.test.ts`). Il lit `src/styles/styles.css` (`fs.readFileSync`), extrait les deux blocs `.bilan-theme` (clair et sombre), et calcule le contraste WCAG (luminance relative, `(L1 + 0.05) / (L2 + 0.05)`). Pour chaque bloc :
  - `--ink` sur `--bg`, `--ink` sur `--surface`, `--muted` sur `--surface`, `--accent-ink` sur `--accent`, `--accent` sur `--surface` : ratio ≥ 4.5 ;
  - les 9 variables sont présentes.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.theme.test.ts`. Attendu : FAIL (bloc absent).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/bilan.theme.test.ts && npm test`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): palette blanc, beige et bleu`.

### Task 3: Contenu de l'accueil et validation

**Files:**
- Modify: `src/bilan/content/types.ts` : types de l'accueil, opérateur `includes`
- Create: `src/bilan/content/intake.ts`
- Modify: `src/bilan/content/validate.ts` : `validateIntake`, et `validateZone` accepte les clés `accueil.*`
- Modify: `src/bilan/content/shoulder.ts` : une règle d'exemple sur l'accueil
- Test: `tests/bilan.intake.content.test.ts`, `tests/bilan.validate.test.ts` (compléter)

**Interfaces:**
- Produces, dans `types.ts` :

```ts
export type Op = 'eq' | 'gte' | 'lte' | 'checked' | 'positive' | 'negative' | 'filled' | 'includes';
interface QBase { id: string; patient: string; clinician: string; source: Source }
export type IntakeQuestion =
  | (QBase & { kind: 'multi'; options: readonly { value: string; label: string }[] })
  | (QBase & { kind: 'single'; options: readonly { value: string; label: string }[]; showIf?: { id: string; includes: string } })
  | (QBase & { kind: 'scale'; lo: string; hi: string })          // 0 à 10
  | (QBase & { kind: 'yesno' })
  | (QBase & { kind: 'psfs'; max: number; lo: string; hi: string })
  | (QBase & { kind: 'bodychart' });
export interface PenDef { id: string; label: string; color: string; source: Source }
export interface IntakeDef { questions: readonly IntakeQuestion[]; pens: readonly PenDef[]; patientPen: string }
```

- Produces : `INTAKE: IntakeDef` dans `intake.ts` ; `validateIntake(i: IntakeDef): string[]` ; `validateZone(z, knownQuestionnaires, intake?: IntakeDef)`. Avec `intake` fourni, une clé de condition `accueil.<id>` est valide si la question existe. Opérateurs autorisés : `multi` → `includes`, `filled` ; `single` → `eq`, `filled` ; `scale` → `gte`, `lte`, `eq`, `filled` ; `yesno` → `eq` (valeur `'oui'` ou `'non'`), `filled` ; `psfs` et `bodychart` → `filled`. La clé spéciale `accueil.chart.regions` accepte `gte` et `lte` (nombre de régions dessinées au crayon `douleur`).
- `validateIntake` signale : id de question ou de crayon en double, id invalide (même règle `ID_RE` que les zones), `patientPen` absent de `pens`, `showIf` vers une question inconnue ou non `multi`, option inconnue dans `showIf.includes`, plus d'une question `bodychart` ou `psfs`, date de source invalide.

Contenu de `INTAKE`, dans cet ordre, tout en source provisoire (`ref: 'provisoire — à valider par Yass (spec accueil §5.3)'`, `added: '2026-11-25'`, `provisional: true`). Textes patient et clinicien :
1. `zones` (`multi`) : « Où avez-vous mal ? » / « Zones douloureuses » ; options `shoulder`, `cervical`, `lumbar`, avec les libellés de `P_REGION` (`src/data/patient.ts`).
2. `cote` (`single`, `showIf: { id: 'zones', includes: 'shoulder' }`) : « Quelle épaule ? » / « Côté » ; `droite` « Droite », `gauche` « Gauche », `deux` « Les deux ».
3. `duree` (`single`) : « Depuis combien de temps avez-vous mal ? » / « Durée » ; options et libellés de `P_DURATION`.
4. `debut` (`single`) : « Comment la douleur a-t-elle commencé ? » / « Début » ; options et libellés de `P_ONSET`.
5. `douleur` (`scale`) : « En moyenne, quelle est l'intensité de votre douleur ? » / « Douleur moyenne (0–10) » ; `lo` « Pas de douleur », `hi` « Pire douleur imaginable ».
6. `chart` (`bodychart`) : « Dessinez là où vous avez mal » / « Body chart ».
7. `psfs` (`psfs`, `max: 3`) : « Citez jusqu'à 3 activités que votre problème vous empêche de faire ou rend difficiles, et notez chacune de 0 à 10 » / « PSFS » ; `lo` « Impossible », `hi` « Comme avant le problème ». Source : `ref: 'Stratford et al. 1995, Physiotherapy Canada — formulation française provisoire, non validée'`, `provisional: true`.
8. `exp`, `fear`, `worry` (`scale`) : textes, `lo` et `hi` repris tels quels de `SL` (`src/data/items.ts`), aussi en texte clinicien ; `ref` mentionnant « repères maison du PDDM, non validés ».
9. `sommeil` (`yesno`) : « La douleur perturbe-t-elle votre sommeil ? » / « Sommeil perturbé par la douleur ».
10. `arret` (`yesno`) : « Êtes-vous en arrêt de travail à cause de cette douleur ? » / « Arrêt de travail ».

Crayons : `douleur` « Douleur » `#c0392b`, `irradiation` « Irradiation » `#e67e22`, `fourmillements` « Fourmillements » `#1f5fa8`, `engourdissement` « Engourdissement » `#7d3c98` ; `patientPen: 'douleur'`.

Règle ajoutée à `shoulder.ts` (exemple de la conception principale §5.6) : `{ id: 'duree-csi', when: { key: 'accueil.duree', op: 'eq', value: 'gt3m' }, kind: 'questionnaire', target: 'csi', reason: 'Douleur depuis plus de 3 mois : dépister une sensibilisation centrale.' }`.

- [ ] **Step 1: Write the failing tests**
  - `bilan.intake.content.test.ts` : `validateIntake(INTAKE)` vaut `[]` ; `validateZone(SHOULDER, [...ids, 'psfs'], INTAKE)` vaut `[]` ; toutes les sources de l'accueil sont `provisional: true` ; les ids dans l'ordre sont `['zones','cote','duree','debut','douleur','chart','psfs','exp','fear','worry','sommeil','arret']` ; `INTAKE.patientPen` vaut `'douleur'` ; les textes `exp` sont ceux de `SL`.
  - `bilan.validate.test.ts` : `validateIntake` détecte un `patientPen` inconnu, un `showIf` vers une question inconnue, un id de crayon en double ; `validateZone` sans `intake` signale `accueil.duree` comme clé inconnue ; avec `INTAKE`, une règle `accueil.douleur` `includes` donne une erreur « opérateur ».
- [ ] **Step 2: Run** `npx vitest run tests/bilan.intake.content.test.ts tests/bilan.validate.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.** Mettre à jour `tests/bilan.content.test.ts` pour appeler `validateZone(SHOULDER, …, INTAKE)`.
- [ ] **Step 4: Run** `npm test`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): contenu de l'accueil patient et validation`.

### Task 4: Géométrie du body chart

**Files:**
- Create: `src/bilan/bodychart/geometry.ts`
- Test: `tests/bilan.geometry.test.ts`

**Interfaces:**
- Produces :

```ts
export type View = 'front' | 'back';
export const VIEW_W = 200, VIEW_H = 420;                 // repère de chaque vue
export interface Stroke { pen: string; view: View; by: 'patient' | 'physio'; pts: readonly number[] /* x0,y0,x1,y1… arrondis à 0,1 */ }
export interface Region { id: string; label: string; view: View; poly: readonly number[] /* x0,y0,… fermé */ }
export const SILHOUETTE: readonly number[];              // contour fermé, identique pour les deux vues
export const REGIONS: readonly Region[];
export function pointInPolygon(x: number, y: number, poly: readonly number[]): boolean;
export function regionsOf(strokes: readonly Stroke[], pen?: string): Region[]; // ordre de REGIONS, sans doublon
```

- La silhouette est une suite de points (pas de courbes), pour pouvoir la tracer à l'identique en SVG et dans jsPDF.
- **Convention de côté** (Review Focus 5) : sur la vue `front`, le côté droit du patient est à **gauche** de l'image (x < 100) ; sur la vue `back`, il est à **droite** (x > 100).
- Régions, chacune en version droite et gauche quand c'est pertinent, sur les deux vues : tête, cou, épaule, bras, coude, avant-bras, main, thorax (face) ou haut du dos (dos), abdomen (face) ou bas du dos (dos), hanche/fesse, cuisse, genou, jambe, pied. Libellés au format « épaule droite (face) », « bas du dos (dos) ». Les polygones peuvent se toucher mais ne doivent pas se chevaucher.
- `regionsOf` : une région est touchée si au moins un point d'un trait de la bonne vue est dedans ; filtre facultatif sur le crayon.

- [ ] **Step 1: Write the failing tests**
  - `pointInPolygon(5, 5, [0,0,10,0,10,10,0,10]) === true` et `(15, 5, …) === false` ;
  - tous les ids de `REGIONS` sont uniques ; chaque région a la vue de son libellé (« (face) » ↔ `front`) ;
  - le centre de « épaule droite (face) » a x < 100, celui de « épaule droite (dos) » a x > 100 ;
  - aucune paire de régions de la même vue ne se chevauche : on vérifie, sur une grille de 2 en 2, qu'aucun point n'est dans deux régions de la même vue ;
  - un trait `front` qui passe au centre de « épaule droite (face) » → `regionsOf` contient cette région ;
  - un trait entièrement hors de la silhouette (`pts: [1,1, 2,2]`) → `[]` ;
  - deux traits dans la même région → une seule occurrence ; `regionsOf(strokes, 'fourmillements')` ignore les traits `douleur`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.geometry.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): géométrie du body chart (silhouette et régions)`.

### Task 5: État de l'accueil, rétrocompatibilité et règles

**Files:**
- Modify: `src/bilan/state/bilan.ts`
- Modify: `src/bilan/storage/vault.ts` (`load` passe par `normalizeBilan`)
- Modify: `src/bilan/engine/rules.ts` (`matches` lit l'accueil)
- Test: `tests/bilan.state.test.ts`, `tests/bilan.rules.test.ts`, `tests/bilan.vault.test.ts` (compléter)

**Interfaces:**
- Consumes : `Stroke`, `regionsOf` (tâche 4), `IntakeQuestion` (tâche 3).
- Produces, dans `bilan.ts` :

```ts
export interface PsfsItem { activity: string; score: number | null }
export type IntakeValue = string | readonly string[] | number | readonly PsfsItem[];   // yesno : 'oui' | 'non'
export type IntakeStatus = 'none' | 'patient' | 'physio';
export interface IntakeState {
  status: IntakeStatus;
  patientAt: string;                                  // ISO, '' si jamais rempli par le patient
  answers: Readonly<Record<string, IntakeValue>>;     // valeurs retenues
  original: Readonly<Record<string, IntakeValue>>;    // réponses données par le patient
  strokes: readonly Stroke[];
}
// BilanState gagne : intake: IntakeState
// BilanAction gagne :
//   | { type: 'intake'; id: string; value: IntakeValue | null; by: 'patient' | 'physio' }
//   | { type: 'stroke'; stroke: Stroke }
//   | { type: 'eraseStroke'; index: number }
//   | { type: 'undoStroke' }
//   | { type: 'intakeStatus'; status: IntakeStatus }    // 'patient' renseigne patientAt
export const LABEL_STATUS: Record<IntakeStatus, string>; // « non fait », « rempli par le patient », « rempli par le physio en séance »
export function normalizeBilan(b: unknown): BilanState;  // complète un bilan du plan 1 (intake vide)
```

- `intake` avec `by: 'patient'` écrit dans `answers` et `original` ; avec `by: 'physio'`, seulement dans `answers`. `value: null` retire la clé de `answers` (et de `original` si `by: 'patient'`). `undoStroke` retire le dernier trait. `isDirty` tient compte de l'accueil.
- `matches` : une clé `accueil.<id>` lit `s.intake.answers[id]`. `includes` est vrai si la valeur est un tableau qui contient `value`. `filled` est vrai si la valeur est présente et non vide (tableau vide, chaîne vide, PSFS sans activité = vide), et pour `accueil.chart` s'il y a au moins un trait. `accueil.chart.regions` compare `regionsOf(s.intake.strokes, 'douleur').length`.

- [ ] **Step 1: Write the failing tests**
  - état : `emptyBilan('shoulder').intake` vaut `{ status: 'none', patientAt: '', answers: {}, original: {}, strokes: [] }` ; `intake` `by: 'patient'` remplit `answers` et `original` ; `by: 'physio'` ensuite change `answers` et laisse `original` ; `intakeStatus 'patient'` renseigne `patientAt` ; `stroke` deux fois puis `undoStroke` laisse un trait ; `eraseStroke` retire le trait d'index donné ; `isDirty` devient vrai après un trait ; `LABEL_STATUS.physio === 'rempli par le physio en séance'`.
  - rétrocompatibilité : `normalizeBilan` sur un objet de forme plan 1 (sans `intake`) donne un état avec l'accueil vide, le reste intact ; dans `bilan.vault.test.ts`, un enregistrement du plan 1 (scellé à la main sans `intake`) se recharge par `load` avec `intake.status === 'none'`.
  - règles : `intake.answers.duree = 'gt3m'` → suggestion `{ kind: 'questionnaire', target: 'csi' }` ; `zones = ['shoulder']` → `matches({ key: 'accueil.zones', op: 'includes', value: 'shoulder' })` est vrai ; avec deux traits `douleur` dans deux régions, `matches({ key: 'accueil.chart.regions', op: 'gte', value: 2 })` est vrai ; PSFS `[{ activity: '', score: null }]` → `filled` faux.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.state.test.ts tests/bilan.rules.test.ts tests/bilan.vault.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): état de l'accueil et lecture par les règles`.

### Task 6: Composant BodyChart

**Files:**
- Create: `src/bilan/ui/BodyChart.tsx`
- Modify: `src/styles/styles.css`
- Test: `tests/bilan.bodychart.test.tsx`

**Interfaces:**
- Consumes : `SILHOUETTE`, `VIEW_W`, `VIEW_H`, `Stroke` (tâche 4), `PenDef` (tâche 3).
- Produces :

```ts
interface Props {
  strokes: readonly Stroke[];
  pens: readonly PenDef[];       // un seul crayon → pas de sélecteur de crayon
  by: 'patient' | 'physio';
  onStroke: (s: Stroke) => void;
  onErase?: (index: number) => void;   // absent → pas de gomme
  onUndo?: () => void;                 // absent → pas de bouton Annuler
}
export default function BodyChart(p: Props): JSX.Element;
```

- Deux `<svg viewBox="0 0 200 420">` côte à côte (étiquettes « Face » et « Dos », et « D » / « G » de chaque côté de la silhouette), avec `role="img"` et `aria-label` « Body chart, vue de face » / « … de dos ». La silhouette en `<polygon>`, chaque trait en `<polyline>` de la couleur de son crayon.
- Dessin par Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`), donc souris, doigt et stylet ; `setPointerCapture` ; CSS `touch-action: none` sur les SVG. Conversion des coordonnées : `x = (clientX - rect.left) / rect.width * VIEW_W`, même chose pour y avec `getBoundingClientRect()`.
- Un trait de moins de 2 points n'est pas émis (Review Focus 3). Points arrondis à 0,1 et espacés d'au moins 1 unité.
- Sélecteur de crayons : boutons radio « Douleur », « Irradiation »… (`fieldset` « Crayon »), le premier crayon est choisi par défaut ; une légende des couleurs est toujours visible.
- Gomme : un bouton bascule « Gomme » (`aria-pressed`) ; en mode gomme, un `pointerdown` sur un trait appelle `onErase(index)`.
- « Annuler le dernier trait » : désactivé s'il n'y a aucun trait.

- [ ] **Step 1: Write the failing tests** (mock de `getBoundingClientRect` à `{ left: 0, top: 0, width: 200, height: 420 }` sur les SVG) :
  - avec un seul crayon, pas de groupe « Crayon » ; avec 4 crayons, le groupe existe et « Douleur » est coché ;
  - `pointerDown(10,10)`, `pointerMove(20,20)`, `pointerMove(30,30)`, `pointerUp` sur la vue de face → `onStroke` reçoit `{ pen: 'douleur', view: 'front', by: 'physio', pts: [10,10,20,20,30,30] }` ;
  - choisir « Fourmillements » puis dessiner sur la vue de dos → `pen: 'fourmillements'`, `view: 'back'` ;
  - un clic seul (`pointerDown` + `pointerUp`) → `onStroke` n'est pas appelé ;
  - gomme active + `pointerDown` sur la `polyline` d'index 1 → `onErase(1)` ;
  - « Annuler le dernier trait » désactivé sans trait, appelle `onUndo` avec un trait ;
  - sans `onErase` ni `onUndo`, ni bouton « Gomme » ni bouton « Annuler ».
- [ ] **Step 2: Run** `npx vitest run tests/bilan.bodychart.test.tsx`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): body chart à dessiner (souris, doigt, stylet)`.

### Task 7: Section Accueil côté physio, exports et PDF

**Files:**
- Create: `src/bilan/ui/IntakeSection.tsx`
- Create: `src/bilan/ui/IntakeField.tsx` (rend une `IntakeQuestion` ; partagé avec la tâche 8 grâce à la prop `audience`)
- Create: `src/bilan/engine/intakeText.ts`
- Modify: `src/bilan/engine/exports.ts`
- Create: `src/pdf/bodychart.ts`
- Modify: `src/pdf/exportPdf.ts` : accepte `PdfLine[]`
- Modify: `src/bilan/ui/BilanApp.tsx` : section Accueil en premier onglet ; nouvelle prop `onStartPatient?: () => void`
- Test: `tests/bilan.intake.ui.test.tsx`, `tests/bilan.exports.test.ts` (compléter)

**Interfaces:**
- Consumes : tout ce qui précède.
- Produces :
  - `IntakeField({ question, state, dispatch, audience }: { question: IntakeQuestion; state: BilanState; dispatch: Dispatch<BilanAction>; audience: 'patient' | 'physio' })`. Libellé `question.patient` ou `question.clinician` selon `audience` ; chaque saisie envoie `{ type: 'intake', id, value, by: audience }`. `multi` → pastilles ; `single` → choix (et masqué si `showIf` n'est pas satisfait) ; `scale` → `Scale` (`src/components/inputs.tsx`) ; `yesno` → deux choix « Oui » / « Non » ; `psfs` → `max` lignes (texte de l'activité et `Scale`) ; `bodychart` → `BodyChart` (patient : seul le crayon `patientPen`, sans gomme ni annulation ; physio : tous les crayons, gomme et annulation).
  - Côté physio, sous une réponse dont `original[id]` existe et diffère de `answers[id]` : `patient : <réponse d'origine en texte>`.
  - `intakeLines(intake: IntakeDef, s: BilanState): string[]` dans `intakeText.ts` : une ligne par réponse remplie, avec le libellé clinicien (`Durée : Plus de 3 mois`, `Douleur moyenne (0–10) : 6`, `Sommeil perturbé par la douleur : oui`, `PSFS : porter un sac 3/10 ; s'habiller 5/10`, `Zones douloureuses : L'épaule, La nuque`). Pour le body chart, une ligne par crayon qui a des régions : `Douleur : épaule droite (face), bras droit (dos)`. Une réponse corrigée ajoute ` (patient : <original>)`. Ligne d'en-tête : `Accueil : <LABEL_STATUS>` (+ ` le JJ.MM.AAAA` si patient).
  - `sysmetaBlocks` : si l'accueil a au moins une réponse ou un trait, `intakeLines` est placé **au début** du bloc « Anamnèse ».
  - `bilanSummaryLines` : section `{ t: 'h', s: 'Accueil' }` en premier, ses lignes, puis la ligne dessin `{ t: 'chart', strokes, pens }` s'il y a des traits. Le type de retour devient `PdfLine[]`.
  - `exportPdf.ts` : `export type PdfLine = SummaryLine | { t: 'chart'; strokes: readonly Stroke[]; pens: readonly PenDef[] }` ; `exportPdf(lines: PdfLine[], date?, prefix?)`. Le PDDM continue de passer des `SummaryLine[]`, sans changement.
  - `drawBodyChart(doc: jsPDF, x: number, y: number, w: number, line: Extract<PdfLine, { t: 'chart' }>): number` dans `src/pdf/bodychart.ts` : trace les deux silhouettes (`SILHOUETTE`) et les traits avec `doc.lines` ou des segments, ajoute la légende des crayons utilisés, et renvoie la hauteur occupée.
  - Section Accueil (premier onglet, même compteur que les autres) : en tête, `Statut : <LABEL_STATUS>` ; boutons « Accueil patient » (appelle `onStartPatient`, présent seulement si la prop est fournie) et « Passer l'accueil » (dispatch `intakeStatus 'physio'`, visible tant que le statut est `none`) ; puis toutes les questions en `audience="physio"`. Une saisie du physio quand le statut est `none` passe le statut à `physio`.
  - Si `zones` est rempli et ne contient pas la zone du bilan, un avertissement : « Le patient n'a pas coché <zone> ».

- [ ] **Step 1: Write the failing tests**
  - `bilan.intake.ui.test.tsx` (sur `BilanApp`, onglet Accueil ouvert par un clic) : « Statut : non fait » ; « Passer l'accueil » → « Statut : rempli par le physio en séance » et le bouton disparaît ; choisir « Plus de 3 mois » fait apparaître la suggestion CSI ; « Quelle épaule » ou « Côté » n'apparaît qu'après avoir coché « L'épaule » ; avec un état initial où `original.douleur = 7` et `answers.douleur = 5`, le texte « patient : 7 » est affiché ; avec `answers.zones = ['cervical']`, l'avertissement « Le patient n'a pas coché Épaule » s'affiche.
  - `bilan.exports.test.ts` : `intakeLines` donne exactement les formats ci-dessus pour un état d'exemple ; le bloc « Anamnèse » commence par `Accueil : rempli par le physio en séance` ; l'identité n'apparaît toujours dans aucun bloc ; avec deux traits, `bilanSummaryLines` contient un élément `t: 'chart'` juste après les lignes de l'accueil ; sans trait, aucun ; accueil vide et bilan vide → toujours `Aucune donnée saisie (non renseigné).`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.intake.ui.test.tsx tests/bilan.exports.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 5: Vérification manuelle du PDF.** Avec Playwright, remplir un accueil avec deux traits de couleurs différentes, cliquer « PDF », récupérer le fichier téléchargé, en convertir la première page en image (`pdftoppm` s'il est disponible, sinon lire le texte avec `pdftotext`) et vérifier que la silhouette, les traits et la légende y figurent.
- [ ] **Step 6: Commit** `feat(bilan): section Accueil, exports et body chart dans le PDF`.

### Task 8: Mode patient verrouillé

**Files:**
- Create: `src/bilan/ui/PatientIntake.tsx`
- Create: `src/bilan/patientGuard.ts`
- Modify: `src/bilan/ui/BilanRoot.tsx`
- Modify: `src/Root.tsx`
- Modify: `src/styles/styles.css`
- Modify: `DECISIONS.md` : entrées 42 à 45 (onglets fermés, palette, accueil et mode patient, body chart à dessiner et régions invisibles)
- Test: `tests/bilan.patient.test.tsx`

**Interfaces:**
- Consumes : `IntakeField` (tâche 7), `BilanApp` avec `onStartPatient` (tâche 7), `unlockVault` (plan 1).
- Produces :
  - `patientGuard.ts` : `isPatientLocked(): boolean`, `setPatientLocked(v: boolean): void`, `onPatientLockChange(fn: () => void): () => void`. L'état est en mémoire seulement. Un `BroadcastChannel('bilan-tabs')` diffuse `'lock'` quand le mode patient commence, s'il existe dans le navigateur.
  - `PatientIntake({ state, dispatch, onDone }: { state: BilanState; dispatch: Dispatch<BilanAction>; onDone: () => void })` : une question par écran (questions masquées par `showIf` sautées), `audience="patient"`, boutons « Précédent », « Suivant », « Terminer ». Sur le dernier écran : « Merci, vous pouvez rendre la tablette. » Le bouton « Terminer » dispatch `intakeStatus 'patient'` puis appelle `onDone`. Aucun nom, code ni identité affiché.
  - `BilanRoot` : nouvel écran `{ k: 'patient'; bilan: BilanState }`.
    - On y entre par `onStartPatient`. Une confirmation intégrée, côté physio, rappelle : « Pour empêcher de quitter le navigateur, active l'Accès guidé (iPad) ou l'épinglage d'écran (Android). » Ce rappel s'affiche à chaque fois : la spec dit « la première fois », mais s'en souvenir demanderait un stockage en clair, interdit ; s'en souvenir dans le coffre chiffré n'apporte rien de plus pour une ligne de texte. Puis `setPatientLocked(true)`, `document.documentElement.requestFullscreen?.()` (erreurs ignorées), `history.pushState` d'une entrée en plus, et un écouteur `popstate` qui la remet (le bouton Précédent du navigateur ne fait rien).
    - Les saisies du patient passent par le même `onChange` que le bilan : enregistrement chiffré au fil de l'eau.
    - Un petit bouton discret « Physio » ouvre une saisie de PIN. `unlockVault(pin)` valide le PIN : s'il est bon, `setPatientLocked(false)`, l'écouteur `popstate` est retiré, et le bilan rouvre l'onglet Accueil ouvert. Si le patient n'a pas terminé, le statut devient `physio`. Un mauvais PIN affiche « PIN incorrect ».
    - Après « Terminer », l'écran reste sur le message de remerciement avec le seul bouton « Physio ».
    - Message `'lock'` reçu d'un autre onglet → `lock()`.
  - `Root.tsx` : si `isPatientLocked()`, il rend `BilanRoot` quel que soit le hash (et se met à jour via `onPatientLockChange`).
  - Le verrouillage automatique (15 min) en mode patient mène à l'écran de déverrouillage. Garde levée seulement par le PIN.

- [ ] **Step 1: Write the failing tests** (`bilan.patient.test.tsx`, avec `fake-indexeddb` comme dans `bilan.root.test.tsx`)
  - Depuis un bilan ouvert : onglet Accueil, « Accueil patient », confirmation → l'écran montre « Où avez-vous mal ? », et ni « Mes bilans », ni « Nouveau bilan », ni le code `B-`, ni l'identité saisie avant (« Dupont ») ne sont dans le document.
  - Un trajet complet : cocher « L'épaule », « Suivant », « Droite », … jusqu'à « Terminer » → « Merci, vous pouvez rendre la tablette. » ; « Physio », PIN `000000` → « PIN incorrect » ; PIN `123456` → le bilan revient, onglet Accueil ouvert, « Statut : rempli par le patient », les réponses sont là, et le texte n'affiche pas « patient : » (pas de correction).
  - Interruption : répondre à la première question, « Physio », bon PIN → « Statut : rempli par le physio en séance », la réponse est là ; la corriger côté physio affiche « patient : L'épaule ».
  - Le body chart en mode patient n'a pas de groupe « Crayon » ni de bouton « Gomme ».
  - Garde : pendant le mode patient, `location.hash = '#/'` puis événement `hashchange` → `Root` affiche toujours l'écran du patient ou du PIN, jamais « Bienvenue » (app PDDM) ; `popstate` → l'écran du patient reste affiché.
  - Autre onglet : un `BilanRoot` déverrouillé reçoit `'lock'` sur `BroadcastChannel('bilan-tabs')` → il affiche « Déverrouiller ». (Si `BroadcastChannel` est absent de l'environnement de test, appeler directement le gestionnaire exporté pour le test.)
- [ ] **Step 2: Run** `npx vitest run tests/bilan.patient.test.tsx`. Attendu : FAIL.
- [ ] **Step 3: Implement.** Mettre à jour `DECISIONS.md`.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 5: Vérification manuelle et captures pour Yass.** Lancer `npm run dev`. Avec Playwright, à 1024 × 768 (tablette) et 390 × 844 (téléphone), en clair :
  - écran PIN, « Mes bilans », bilan avec deux onglets ouverts ;
  - accueil patient (question body chart avec un trait dessiné à la souris) ;
  - section Accueil côté physio avec plusieurs crayons ;
  - une capture du bilan en mode sombre.
  Vérifier qu'il n'y a ni débordement horizontal ni erreur dans la console, et que `/` affiche toujours l'app PDDM avec ses couleurs d'origine. Enregistrer les captures dans le dossier de travail temporaire et les envoyer à Yass pour qu'il valide les couleurs.
- [ ] **Step 6: Commit** `feat(bilan): accueil patient en mode verrouillé sur la tablette`.

---

## Plans suivants

2. **Relais, synchronisation chiffrée et IA** (inchangé, sauf que l'accueil n'est plus envoyé par QR code ; seuls les questionnaires ciblés de fin de séance le sont).
3. **Questionnaires sous licence servis par le relais** et retour des scores.
4. **Intégration du PDDM, lombaire et cervical**.
