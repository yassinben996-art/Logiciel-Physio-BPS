# Socle du bilan standardisé (épaule pilote) — plan d'implémentation 1/4

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un écran de bilan clinicien, utilisable en séance, entièrement piloté par des fichiers de contenu modulables : sections et champs chiffrés de l'épaule, pastilles, détection de mots-clés confirmée, suggestions du moteur de règles, export en blocs SYSmeta et en PDF, identité du patient, et sauvegarde automatique chiffrée sur l'appareil, avec la liste de « Mes bilans ».

**Architecture:** Nouveau dossier `src/bilan/`, isolé du module PDDM :
- `content/` : types et données ;
- `engine/` : fonctions pures pour les règles, les mots-clés et les exports ;
- `state/` : un `useReducer` ;
- `ui/` : React.

L'écran est accessible par la route `#/bilan`. L'app PDDM existante reste la page par défaut et n'est pas modifiée, hormis un paramètre facultatif ajouté à `exportPdf`. Pas de réseau dans ce plan. La sauvegarde est locale, dans IndexedDB, chiffrée par un PIN ; la synchronisation entre appareils via le relais arrive au plan 2.

**Tech Stack:** Vite, React 18, TypeScript strict, Vitest et Testing Library, jsPDF (existant).

**Spec:** `docs/superpowers/specs/2026-11-24-bilan-standardise-design.md`

## Global Constraints

- Interface entièrement en français, en tutoiement pour le clinicien (comme dans les échanges avec Yass).
- Aucun chiffre clinique inventé (spec §3). Une propriété diagnostique (`sens`, `spec`, `lrPos`, `lrNeg`) n'est autorisée qu'avec une `ref` dont `provisional !== true`. Tout le contenu de ce plan est provisoire et porte `provisional: true`.
- Modularité (spec §5.1) : ajouter, retirer ou réordonner une section, un champ, une pastille ou une règle se fait **uniquement** dans `src/bilan/content/*.ts`. Chaque élément de contenu porte `source: { ref, added }`.
- Rien n'est jamais coché ni accepté automatiquement (spec §5.4, anti-objectif « l'IA décide à la place du clinicien »).
- Le moteur PDDM, ses données et `tests/parity.test.ts` ne sont pas modifiés. Les tests existants restent verts.
- Bandeau permanent : réutiliser `DISCLAIMER` (`src/data/text.ts`).
- `npm run lint` sans aucun avertissement, `npm run typecheck` et `npm test` verts avant chaque commit.
- Aucune requête réseau dans ce plan. Le seul stockage est IndexedDB, **toujours chiffré** en AES-GCM 256, avec une clé dérivée du PIN par PBKDF2-SHA256 (600 000 itérations, sel aléatoire de 16 octets). Aucun `localStorage` ni `sessionStorage`.
- Identité du patient (nom, prénom, date de naissance) : elle figure dans le PDF et dans la liste « Mes bilans », mais **jamais** dans les blocs SYSmeta. Les plans suivants l'excluront aussi de l'IA et de « Copier pour Claude ».

## Review Focus

1. **Valeur hors bornes** (ex. une RE à 500° ou une force négative) : un message s'affiche sous le champ, et la valeur est ignorée par les règles et les exports. C'est le même principe que DECISIONS.md n° 2. → test dans la tâche 3 (reducer) et la tâche 6 (exports).
2. **Mots-clés avec majuscules, accents ou pluriel** (« Fourmillements », « fourmillement », « FOURMILLEMENTS », « réveils nocturnes ») : ils doivent être détectés. → test dans la tâche 5.
3. **Négation** (« pas de fourmillements », « sans irradiation ») : la suggestion est marquée « peut-être nié », et rien n'est coché. → test dans la tâche 5.
4. **Contenu mal édité** (identifiant en double, règle pointant vers un champ inexistant, propriété diagnostique sans source validée) : le test d'intégrité échoue en CI, plutôt que l'écran plante en séance. → tâches 1 et 2.
5. **Rechargement de la page en plein bilan** : le bilan est retrouvé à l'identique après le déverrouillage. Une erreur de PIN affiche « PIN incorrect », sans plantage. Un **PIN oublié** rend les données irrécupérables, et c'est écrit noir sur blanc à la création du PIN. Un export d'un bilan vide ne plante pas et indique « non renseigné ». → tâches 6 et 8.

---

### Task 1: Schéma de contenu et validateur

**Files:**
- Create: `src/bilan/content/types.ts`
- Create: `src/bilan/content/validate.ts`
- Test: `tests/bilan.validate.test.ts`

**Interfaces:**
- Produces (exactement) :

```ts
export interface Source { ref: string; added: string /* AAAA-MM-JJ */; provisional?: boolean }
export interface Dx { sens?: number; spec?: number; lrPos?: number; lrNeg?: number; source: Source }
export interface ChipDef { id: string; label: string; keywords?: readonly string[]; redFlag?: boolean; source: Source }
export type SysmetaRubric =
  | 'Anamnèse' | 'Bilan articulaire' | 'Bilan musculaire'
  | "Test / Echelle d'évaluation" | 'Red flags / Yellow flags' | 'Plan de traitement';
export type FieldDef =
  | { kind: 'number'; id: string; label: string; unit?: string; min: number; max: number; sided?: boolean; source: Source }
  | { kind: 'choice'; id: string; label: string; options: readonly { value: string; label: string }[]; source: Source }
  | { kind: 'test'; id: string; label: string; dx?: Dx; source: Source }
  | { kind: 'chips'; id: string; label: string; chips: readonly ChipDef[]; source: Source }
  | { kind: 'notes'; id: string; label: string; source: Source };
export interface SectionDef { id: string; title: string; sysmeta?: SysmetaRubric; fields: readonly FieldDef[]; source: Source }
export type Op = 'eq' | 'gte' | 'lte' | 'checked' | 'positive' | 'negative' | 'filled';
export interface Atom { key: string /* "section.field" ou "section.field.chip" */; op: Op; value?: number | string }
export type Condition = Atom | { all: readonly Condition[] } | { any: readonly Condition[] };
export type SuggestionKind = 'test' | 'questionnaire' | 'redflag';
export interface RuleDef { id: string; when: Condition; kind: SuggestionKind; target: string; reason: string; source: Source }
export interface ZoneDef { id: 'shoulder' | 'lumbar' | 'cervical'; label: string; sections: readonly SectionDef[]; rules: readonly RuleDef[] }
```

- Produces : `validateZone(z: ZoneDef, knownQuestionnaires: readonly string[]): string[]`. Retourne la liste des erreurs en français ; une liste vide signifie un contenu valide.
- Pour une règle de type `test`, la cible désigne un champ `test` sous la forme `"section.field"`.
- Pour une règle de type `questionnaire`, la cible est un identifiant de la banque (`QUESTIONNAIRES[].id` ou `'psfs'`).
- Pour une règle de type `redflag`, la cible désigne une pastille avec `redFlag: true`, sous la forme `"section.field.chip"`.

- [ ] **Step 1: Write the failing tests** (`tests/bilan.validate.test.ts`). À partir d'une petite zone valide écrite dans le test :

```ts
it('zone valide → aucune erreur', () => expect(validateZone(ok, ['tsk'])).toEqual([]));
it('id de section en double', () => expect(validateZone(dupSection, [])).toContainEqual(expect.stringContaining('section en double')));
it('id de champ en double dans une section', () => expect(validateZone(dupField, [])).toContainEqual(expect.stringContaining('champ en double')));
it('règle vers une clé inconnue', () => expect(validateZone(badKey, [])).toContainEqual(expect.stringContaining('clé inconnue')));
it('règle questionnaire inconnu', () => expect(validateZone(badQ, ['tsk'])).toContainEqual(expect.stringContaining('questionnaire inconnu')));
it('règle redflag vers une pastille non redFlag', () => expect(validateZone(badRf, [])).toContainEqual(expect.stringContaining('drapeau')));
it('dx chiffré avec source provisoire', () => expect(validateZone(dxProv, [])).toContainEqual(expect.stringContaining('source validée')));
it('number avec min > max', () => expect(validateZone(badRange, [])).toContainEqual(expect.stringContaining('bornes')));
it('date added invalide', () => expect(validateZone(badDate, [])).toContainEqual(expect.stringContaining('date')));
```

- [ ] **Step 2: Run** `npx vitest run tests/bilan.validate.test.ts`. Attendu : FAIL (module introuvable).
- [ ] **Step 3: Implement** `types.ts` (le bloc ci-dessus) et `validateZone` dans `validate.ts`. Les clés de condition sont résolues contre les sections, les champs et les pastilles de la zone. Une clé `"s.f"` vers un champ `number` accepte `eq`, `gte`, `lte` et `filled` ; vers un champ `test`, `positive`, `negative` et `filled` ; une clé `"s.f.chip"` accepte `checked`.
- [ ] **Step 4: Run** le même test. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): schéma de contenu modulable et validateur`.

### Task 2: Contenu provisoire de l'épaule

**Files:**
- Create: `src/bilan/content/shoulder.ts`
- Create: `src/bilan/content/index.ts`
- Test: `tests/bilan.content.test.ts`

**Interfaces:**
- Consumes : les types et `validateZone` (tâche 1), `QUESTIONNAIRES` (`@q`).
- Produces : `SHOULDER: ZoneDef` et `ZONES: Readonly<Partial<Record<ZoneDef['id'], ZoneDef>>>` (pour ce plan, uniquement `{ shoulder: SHOULDER }`).

Contenu, tout en `source: { ref: 'provisoire — remplacé par la revue de littérature (spec §5.3)', added: '2026-11-24', provisional: true }` :
- **Sections, dans cet ordre, avec ces id** :
  - `anamnese` (Anamnèse) ;
  - `drapeaux` (Red flags / Yellow flags) ;
  - `mobilite` (Bilan articulaire) ;
  - `force` (Bilan musculaire) ;
  - `tests` (Test / Echelle d'évaluation) ;
  - `modif` : tests de modification des symptômes (Test / Echelle d'évaluation) ;
  - `raisonnement` (sans rubrique) ;
  - `plan` (Plan de traitement).
  
  Chaque section a un champ `notes` d'id `notes`.
- **Champs chiffrés** :
  - `mobilite` : `flex_a`, `abd_a`, `re1_a` et `ri_a` en actif, puis les mêmes en passif (`_p`). Tous sont `sided: true`, en `°`, avec `min: 0`, `max: 200`.
  - `force` : `re`, `ri` et `abd`, `sided: true`, en `kg`, avec `min: 0`, `max: 100`.
- **Tests** (`tests`, sans `dx` puisque provisoires) : `full_can`, `empty_can`, `er_lag`, `ir_lag`, `hawkins`, `neer`, `belly_press`, `lift_off`, `drop_arm`.
- **`modif`** : les tests `scap_assist` et `scap_retraction`.
- **Pastilles** :
  - `anamnese.signes` : `nocturne` (mots-clés `nuit`, `nocturne`, `réveil`), `irradiation` (`irradie`, `irradiation`, `descend`), `paresthesies` (`fourmillement`, `picotement`, `paresthésie`), `traumatisme` (`chute`, `choc`, `trauma`), `raideur` (`raide`, `raideur`, `bloqué`) ;
  - `drapeaux.rouges` (toutes avec `redFlag: true`) : `perte_poids` (`perte de poids`, `maigri`), `fievre` (`fièvre`), `atcd_cancer` (`cancer`), `deficit_neuro` (`faiblesse soudaine`, `paralysie`) ;
  - `drapeaux.jaunes` : `peur_mvt` (`peur`, `appréhension`), `catastrophisme` (`catastrophe`, `jamais guérir`).
- **Règles** (exemples de mécanique, raison rédigée, source provisoire) :
  - `full_can` positif → suggérer `tests.er_lag`, puis `tests.drop_arm` ;
  - `force.re` rempli → suggérer `tests.er_lag` ;
  - pastille `drapeaux.jaunes.peur_mvt` cochée → questionnaire `tsk` ;
  - pastille `drapeaux.jaunes.catastrophisme` cochée → `pcs` ;
  - pastille `anamnese.signes.nocturne` cochée → redflag `drapeaux.rouges.atcd_cancer`, avec pour raison « douleur nocturne : vérifier les antécédents de cancer » ;
  - toujours → questionnaire `quickdash`, avec la condition `{ key: 'anamnese.notes', op: 'filled' }`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('épaule valide', () => expect(validateZone(SHOULDER, [...QUESTIONNAIRES.map(q => q.id), 'psfs'])).toEqual([]));
it('tout est marqué provisoire', () => expect(allSources(SHOULDER).every(s => s.provisional === true)).toBe(true));
it('ordre des sections', () => expect(SHOULDER.sections.map(s => s.id)).toEqual(['anamnese','drapeaux','mobilite','force','tests','modif','raisonnement','plan']));
it('aucun dx chiffré dans le provisoire', () => expect(allTests(SHOULDER).some(t => t.dx)).toBe(false));
```

  `allSources` et `allTests` sont de petits helpers locaux au test : ils parcourent les sections, les champs, les pastilles et les règles.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.content.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement** `shoulder.ts` et `index.ts`.
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): contenu provisoire épaule`.

### Task 3: État du bilan (reducer)

**Files:**
- Create: `src/bilan/state/bilan.ts`
- Test: `tests/bilan.state.test.ts`

**Interfaces:**
- Produces :

```ts
export type Side = 'G' | 'D';
export type TestResult = 'pos' | 'neg';
export interface Identity { nom: string; prenom: string; naissance: string /* AAAA-MM-JJ ou '' */ }
export interface BilanState {
  id: string;                                    // crypto.randomUUID()
  code: string;                                  // "B-" + 4 chiffres, affichage seulement
  createdAt: string; updatedAt: string;          // ISO
  identity: Identity;
  zone: ZoneDef['id'];
  nums: Readonly<Record<string, number>>;        // clé "s.f" ou "s.f.G" / "s.f.D" si sided
  invalid: Readonly<Record<string, true>>;       // clés saisies hors bornes
  choices: Readonly<Record<string, string>>;
  tests: Readonly<Record<string, TestResult>>;   // clé "s.f"
  chips: Readonly<Record<string, true>>;         // clé "s.f.chip"
  notes: Readonly<Record<string, string>>;       // clé "s.notes"
  accepted: readonly string[];                   // ids de règles
  dismissed: readonly string[];                  // ids de règles + "kw:<s.f.chip>" refusés
}
export type BilanAction =
  | { type: 'num'; key: string; value: number | null; min: number; max: number }
  | { type: 'choice'; key: string; value: string | null }
  | { type: 'test'; key: string; value: TestResult | null }
  | { type: 'chip'; key: string; value: boolean }
  | { type: 'note'; key: string; value: string }
  | { type: 'identity'; field: keyof Identity; value: string }
  | { type: 'accept'; id: string } | { type: 'dismiss'; id: string }
  | { type: 'load'; bilan: BilanState }
  | { type: 'reset' };
export const emptyBilan: (zone: ZoneDef['id']) => BilanState;
export function bilanReducer(s: BilanState, a: BilanAction): BilanState;
export const isDirty: (s: BilanState) => boolean;
```

- [ ] **Step 1: Write the failing tests:**
  - `num` dans les bornes → `nums[key]` est défini et `invalid[key]` absent ;
  - `num` 500 avec `max: 200` → `nums[key]` absent et `invalid[key] === true` ;
  - `num` `null` → la clé est retirée de `nums` et de `invalid` ;
  - `test` `null` → la clé est retirée ;
  - `chip` `false` → la clé est retirée ;
  - `accept` deux fois → l'identifiant n'apparaît qu'une fois ;
  - `isDirty(emptyBilan('shoulder')) === false`, et devient `true` après une `note` ;
  - `reset` → nouvel `id` et nouveau `code`, contenu vide, même zone ;
  - `identity` → `isDirty` vaut `true` ;
  - `code` correspond à `/^B-\d{4}$/` ;
  - `load` remplace l'état tel quel.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.state.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement** de façon immuable, sans dépendance à React.
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): état et reducer du bilan`.

### Task 4: Moteur de règles

**Files:**
- Create: `src/bilan/engine/rules.ts`
- Test: `tests/bilan.rules.test.ts`

**Interfaces:**
- Consumes : `ZoneDef`, `RuleDef`, `Condition` (tâche 1) et `BilanState` (tâche 3).
- Produces :
  - `interface Suggestion { ruleId: string; kind: SuggestionKind; target: string; label: string; reason: string; source: Source }` ;
  - `evaluate(z: ZoneDef, s: BilanState): Suggestion[]` ;
  - `matches(c: Condition, s: BilanState): boolean`.
- Le `label` est le libellé du test ou de la pastille ciblée, ou le `name` du questionnaire (`'PSFS'` pour `psfs`).
- Pour un `number` `sided`, `gte`, `lte` et `filled` sont vrais si **au moins un** côté satisfait la condition.
- On exclut :
  - les règles déjà acceptées ou refusées ;
  - les suggestions de type `test` dont la cible a déjà un résultat ;
  - les suggestions de type `redflag` dont la pastille est déjà cochée.
- Une même cible n'apparaît qu'une seule fois, avec la première règle dans l'ordre du contenu. L'ordre de sortie suit l'ordre des règles.

- [ ] **Step 1: Write the failing tests**, sur `SHOULDER` :
  - un état vide donne `[]` ;
  - `tests['tests.full_can']='pos'` → les cibles valent `['tests.er_lag','tests.drop_arm']` ;
  - si on ajoute en plus `tests['tests.er_lag']='neg'` → la cible `tests.er_lag` disparaît ;
  - la pastille `drapeaux.jaunes.peur_mvt` → une suggestion `{ kind: 'questionnaire', target: 'tsk' }` ;
  - `dismissed` contenant l'identifiant de la règle → la suggestion disparaît ;
  - `nums['force.re.D']=12` → `er_lag` est suggéré ;
  - si `invalid['force.re.D']` est vrai et la clé absente de `nums` → `er_lag` n'est pas suggéré ;
  - `matches({ any: [] }, s) === false` et `matches({ all: [] }, s) === true`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.rules.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): moteur de règles`.

### Task 5: Détection de mots-clés

**Files:**
- Create: `src/bilan/engine/keywords.ts`
- Test: `tests/bilan.keywords.test.ts`

**Interfaces:**
- Produces :
  - `interface KeywordHit { key: string /* "s.f.chip" */; label: string; matched: string; possiblyNegated: boolean }` ;
  - `normalize(t: string): string`, qui passe en minuscules et retire les accents avec NFD ;
  - `detectKeywords(z: ZoneDef, s: BilanState): KeywordHit[]`.
- Toutes les notes de `s.notes` sont parcourues, contre toutes les pastilles qui ont des `keywords`, dans toutes les sections.
- Un mot-clé correspond en début de mot ; un pluriel ou un suffixe est accepté : `fourmillement` reconnaît `fourmillements`.
- `possiblyNegated` vaut `true` si l'un des mots `pas`, `sans`, `aucun`, `aucune`, `jamais` ou `ni` apparaît dans les 3 mots qui précèdent la correspondance.
- On exclut les pastilles déjà cochées et les `kw:<key>` présents dans `dismissed`. Une même pastille n'apparaît qu'une fois.

- [ ] **Step 1: Write the failing tests:**

```ts
note('anamnese.notes', 'FOURMILLEMENTS dans les doigts la nuit') → keys ⊇ ['anamnese.signes.paresthesies','anamnese.signes.nocturne'], possiblyNegated false
note('anamnese.notes', 'pas de fourmillements')               → hit paresthesies avec possiblyNegated true
note('anamnese.notes', 'réveils nocturnes')                    → hit nocturne
note('anamnese.notes', 'nuitamment')                            → hit nocturne (préfixe accepté, documenté)
note('anamnese.notes', 'il a maigri, perte de poids')          → une seule occurrence de drapeaux.rouges.perte_poids
pastille déjà cochée ou 'kw:anamnese.signes.nocturne' dans dismissed → absente
```

- [ ] **Step 2: Run** `npx vitest run tests/bilan.keywords.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): détection de mots-clés avec repérage des négations`.

### Task 6: Exports (blocs SYSmeta et lignes PDF)

**Files:**
- Create: `src/bilan/engine/exports.ts`
- Modify: `src/pdf/exportPdf.ts` : ajouter le 3e paramètre facultatif `prefix = 'profil-douleur'` à `pdfFilename` et à `exportPdf`, sans changer le comportement par défaut.
- Test: `tests/bilan.exports.test.ts`

**Interfaces:**
- Consumes : `SummaryLine` (`src/engine/summary.ts`), `exportPdf(lines, date?, prefix?)`.
- Produces :
  - `interface SysmetaBlock { rubric: SysmetaRubric; text: string }` ;
  - `sysmetaBlocks(z: ZoneDef, s: BilanState): SysmetaBlock[]` ;
  - `bilanSummaryLines(z: ZoneDef, s: BilanState, date?: Date): SummaryLine[]`.
- Formats exacts :
  - nombre avec côtés : `Abduction active : D 150° / G 170°`, en ne citant que les côtés saisis ;
  - test : `Full can : positif` ou `Full can : négatif` ;
  - pastilles cochées : `Signes : nocturne, paresthésies` ;
  - notes : reprises telles quelles ;
  - les décimales utilisent la virgule, via `fr()` de `src/engine/format.ts`.
- Seuls les champs remplis apparaissent. Une rubrique vide est omise.
- Les sections sans `sysmeta` n'apparaissent que dans le PDF.
- L'identité n'apparaît **jamais** dans les blocs SYSmeta.
- Le PDF commence par le titre `Bilan : <label de la zone>`, puis `Patient : <Prénom> <Nom>, né(e) le JJ.MM.AAAA` si l'identité est renseignée (les parties vides sont omises), le code, la date `fr-CH`, puis une section par titre (`t: 'h'`). Il se termine par une ligne `n` contenant `DISCLAIMER`.
- Un bilan vide donne `[]` côté SYSmeta. Côté PDF, on obtient le titre, la ligne `Aucune donnée saisie (non renseigné).` et le bandeau.

- [ ] **Step 1: Write the failing tests:**
  - les formats exacts ci-dessus ;
  - une valeur dans `invalid` qui n'est pas dans `nums` n'apparaît pas ;
  - bilan vide côté SYSmeta → `[]` ;
  - une identité renseignée (`Dupont`, `Marie`, `1980-03-05`) → absente de tous les `text` SYSmeta, et présente dans le PDF sous la forme `Patient : Marie Dupont, né(e) le 05.03.1980` ;
  - bilan vide côté PDF → contient `'Aucune donnée saisie (non renseigné).'` ;
  - `pdfFilename(new Date(2026,10,24), 'bilan') === 'bilan-2026-11-24.pdf'` ;
  - `pdfFilename(new Date(2026,10,24)) === 'profil-douleur-2026-11-24.pdf'`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.exports.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Attendu : PASS, y compris tous les tests existants.
- [ ] **Step 5: Commit** `feat(bilan): exports SYSmeta et PDF`.

### Task 7: Écran de bilan et route `#/bilan`

**Files:**
- Create: `src/bilan/ui/BilanApp.tsx`, qui gère l'état, la confirmation à la fermeture et la mise en page
- Create: `src/bilan/ui/FieldInput.tsx`, qui rend un `FieldDef`
- Create: `src/bilan/ui/SuggestionsPanel.tsx`
- Create: `src/bilan/ui/KeywordPrompts.tsx`
- Create: `src/bilan/ui/BilanExport.tsx`
- Modify: `src/main.tsx` : rendre `BilanApp` si `location.hash === '#/bilan'`, sinon `App`, et écouter `hashchange`
- Modify: `src/styles/styles.css` (styles `.bilan-*`)
- Test: `tests/bilan.ui.test.tsx`

**Interfaces:**
- Consumes : tout ce qui précède. On réutilise `NumberField`, `Check` (`src/components/ui.tsx`) et `Chips` (`src/components/inputs.tsx`).
- Produces : `export default function BilanApp(): JSX.Element`.

Comportement :
- **Mise en page** : sections en `<details>`, toutes ouvertes par défaut, dans l'ordre du contenu.
- **Champs** :
  - un `number` avec `sided` affiche deux champs, `D` et `G` ;
  - un `test` affiche trois boutons radio : « positif », « négatif » et « non fait » (valeur `null`) ;
  - une `notes` est une `<textarea>`, avec l'attribut `autocapitalize="sentences"` pour la dictée du clavier.
- **Suggestions** : le panneau est collant, en colonne de droite au-delà de 900 px et en bas d'écran en dessous. Il liste `evaluate()`, et chaque suggestion affiche son libellé, sa raison, la mention « Source provisoire » si `provisional`, et deux boutons, « Ajouter » (`accept`) et « Ignorer » (`dismiss`).
  - Pour une suggestion de type `test`, « Ajouter » fait défiler la page jusqu'au test et place le focus sur son groupe.
  - Pour un `questionnaire`, l'identifiant s'ajoute à une liste « Questionnaires à proposer ». Le QR code arrive au plan 3.
- **Mots-clés** : sous chaque `textarea`, une invite par résultat : « Tu as noté "<matched>" : cocher <label> ? », avec deux boutons, « Cocher » (dispatch `chip`) et « Non » (dispatch `dismiss` `kw:<key>`). Si `possiblyNegated`, la mention « (peut-être nié) » est ajoutée.
- **Export** :
  - « Copier pour SYSmeta », un bouton par rubrique, via `navigator.clipboard.writeText`, avec le retour « Copié » ;
  - « PDF », via `exportPdf(bilanSummaryLines(...), new Date(), 'bilan')`.
- **En-tête patient** : trois champs (nom, prénom, date de naissance en `type="date"`) et le code `B-xxxx` affiché.
- Le branchement de la sauvegarde se fait à la tâche 8 : dans cette tâche, `BilanApp` reçoit `initial?: BilanState` et `onChange?: (s: BilanState) => void`.
- **Réinitialisation** : un bouton « Nouveau bilan » ouvre une confirmation intégrée à la page, comme le « nouveau patient » existant.
- `DISCLAIMER` est affiché en pied de page.

- [ ] **Step 1: Write the failing tests** (Testing Library) :
  - `render(<BilanApp />)` affiche les 8 titres de section dans l'ordre ;
  - cocher « positif » sur « Full can » fait apparaître « ER lag sign » et « Drop arm » dans la région `Suggestions` ;
  - « Ignorer » sur l'une d'elles la retire ;
  - taper « fourmillements la nuit » dans les notes d'anamnèse affiche deux invites ; « Cocher » sur paresthésies coche la pastille correspondante, et l'invite disparaît ;
  - « pas de fièvre » affiche une invite avec la mention « (peut-être nié) », et la pastille n'est pas cochée tant qu'on ne clique pas ;
  - saisir 500 en abduction active D affiche un message d'erreur, et la valeur n'apparaît pas dans le bloc « Bilan articulaire » copié (mock de `navigator.clipboard.writeText`) ;
  - saisir le nom « Dupont » ne l'ajoute à aucun bloc SYSmeta copié ;
  - `onChange` est appelé avec le nouvel état après une saisie.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.ui.test.tsx`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 5: Vérification manuelle.** Lancer `npm run dev`, ouvrir `http://localhost:5173/#/bilan` à 360 px et 1024 px de large (Playwright ou un navigateur), et faire une capture d'écran : rien ne déborde et le panneau de suggestions reste lisible. Vérifier que `/` affiche toujours l'app PDDM, inchangée.
- [ ] **Step 6: Commit** `feat(bilan): écran de bilan épaule (route #/bilan)`.

### Task 8: Sauvegarde automatique chiffrée et « Mes bilans »

**Files:**
- Create: `src/bilan/storage/crypto.ts`
- Create: `src/bilan/storage/vault.ts`
- Create: `src/bilan/ui/LockScreen.tsx`
- Create: `src/bilan/ui/BilanList.tsx`
- Create: `src/bilan/ui/BilanRoot.tsx`
- Modify: `src/main.tsx` : `#/bilan` rend désormais `BilanRoot`
- Modify: `package.json` : ajouter la dépendance de dev `fake-indexeddb`
- Modify: `tests/setup.ts` : `import 'fake-indexeddb/auto'`
- Modify: `DECISIONS.md` : ajouter les entrées 38 à 41 (route `#/bilan`, contenu provisoire, coffre local chiffré par PIN, identité jamais dans SYSmeta ni l'IA)
- Test: `tests/bilan.vault.test.ts`, `tests/bilan.root.test.tsx`

**Interfaces:**
- Consumes : `BilanState`, `emptyBilan` (tâche 3) et `BilanApp` avec ses props `initial` et `onChange` (tâche 7).
- Produces :

```ts
// crypto.ts — WebCrypto uniquement, aucune dépendance
export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey>; // PBKDF2-SHA256, 600 000 itérations, AES-GCM 256
export async function seal(key: CryptoKey, data: unknown): Promise<{ iv: string; ct: string }>; // base64, iv aléatoire de 12 octets
export async function open<T>(key: CryptoKey, box: { iv: string; ct: string }): Promise<T>; // rejette si mauvaise clé
// vault.ts — base IndexedDB « bilan-vault », stores « meta » et « bilans »
export interface BilanMeta { id: string; code: string; label: string /* "Prénom Nom" ou code */; zone: string; updatedAt: string }
export interface Vault {
  list(): Promise<BilanMeta[]>;            // triés par updatedAt décroissant
  load(id: string): Promise<BilanState | null>;
  save(b: BilanState): Promise<void>;      // met à jour updatedAt
  remove(id: string): Promise<void>;
}
export async function hasVault(): Promise<boolean>;
export async function createVault(pin: string): Promise<Vault>;  // PIN de 6 chiffres exactement, sinon rejette
export async function unlockVault(pin: string): Promise<Vault>;  // rejette Error('PIN incorrect')
```

Le libellé (`label`) est lui aussi chiffré : la liste est stockée comme un seul enregistrement chiffré, et rien de lisible ne reste en clair dans IndexedDB, à part le sel et un vérificateur chiffré.

Comportement de `BilanRoot` :
- **Écran de verrouillage** : au premier lancement, on crée un PIN de 6 chiffres, saisi deux fois, avec le texte exact « Si tu oublies ce PIN, tes bilans seront perdus : ils sont chiffrés et personne ne peut les récupérer. ». Ensuite, on saisit simplement le PIN.
- **« Mes bilans »** : liste avec une recherche sur le libellé, et les boutons « Nouveau bilan », « Ouvrir » et « Supprimer » (confirmation intégrée à la page).
- **Sauvegarde automatique** : 500 ms après la dernière modification (`onChange`), avec un indicateur « Enregistré » ou « Enregistrement… ». La confirmation `beforeunload` ne s'active que s'il reste une sauvegarde en attente.
- **Verrouillage automatique** après 15 minutes d'inactivité, et bouton « Verrouiller ».

- [ ] **Step 1: Write the failing tests** (`bilan.vault.test.ts`) :
  - `createVault('123456')`, puis `save` et `load` → l'état est retrouvé à l'identique ;
  - `unlockVault('000000')` → rejette avec `'PIN incorrect'` ;
  - `unlockVault('123456')` → `list()` contient le bilan, avec `label` égal à `'Marie Dupont'` ;
  - le contenu brut d'IndexedDB ne contient ni `'Dupont'` ni `'fourmillements'` (on lit les stores directement) ;
  - `createVault('12a')` → rejette ;
  - `remove` → `load` renvoie `null`.
- [ ] **Step 2: Write the failing tests** (`bilan.root.test.tsx`) :
  - premier lancement → l'écran de création du PIN s'affiche, avec le texte exact d'avertissement ;
  - après la création du PIN → « Mes bilans » est vide, puis « Nouveau bilan » ouvre le bilan ;
  - après une saisie et 500 ms de faux minuteurs → « Enregistré » s'affiche ;
  - démonter puis remonter `BilanRoot` et saisir le PIN → le bilan figure dans la liste, et la saisie y est conservée.
- [ ] **Step 3: Run** `npx vitest run tests/bilan.vault.test.ts tests/bilan.root.test.tsx`. Attendu : FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 6: Vérification manuelle.** Lancer `npm run dev`, puis ouvrir `/#/bilan` : créer le PIN, remplir un bilan, recharger la page, déverrouiller, et retrouver le bilan. Faire une capture à 360 px et à 1024 px.
- [ ] **Step 7: Commit** `feat(bilan): sauvegarde automatique chiffrée et liste des bilans`.

---

## Plans suivants (rédigés chacun après validation du précédent)

2. **Relais, synchronisation chiffrée et IA** :
   - choix et vérification du fournisseur gratuit hébergé en Europe ;
   - appairage des appareils (même clé que le coffre local) et synchronisation de bout en bout ;
   - historique et comparaison au rebilan ;
   - IA Groq `gpt-oss-120b` relayée par le serveur, sans jamais envoyer l'identité, avec nettoyage des noms et des dates dans les notes ;
   - appel par section, suggestions fusionnées avec celles des règles ;
   - **bascule automatique** : autre modèle Groq, puis autre fournisseur vérifié, puis règles seules, avec un indicateur ;
   - bouton « Copier pour Claude ».
3. **Accueil patient et questionnaires par QR code** : accueil de 5 minutes (body chart, PSFS, dépistage), jetons de QR à usage limité, questionnaires sous licence servis par le relais, retour automatique des scores.
4. **Intégration du PDDM, lombaire et cervical** : préremplissage du PDDM, couche « douleur chronique », PDF final.

**En parallèle, hors code** : revue de la littérature sur l'épaule (document « Bilan de l'épaule : structure et contenu fondés sur les preuves »), à valider par Yass avant de remplacer le contenu marqué `provisional: true`.
