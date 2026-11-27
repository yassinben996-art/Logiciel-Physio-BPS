# Questionnaires à domicile — plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** à la fin de la séance, Yass crée un QR code ; le patient remplit chez lui des questionnaires choisis ; ses réponses, chiffrées, arrivent seules dans le bilan avec les scores.

**Architecture:**
- Le relais garde une boîte aux lettres par ticket (table `home_q`).
- Le téléphone du patient chiffre ses réponses avec une clé qui n'existe que dans le lien et dans le bilan.
- À chaque synchronisation, un appareil de Yass relève la boîte (bail atomique), intègre les réponses dans le bilan, puis supprime le dépôt.

**Tech Stack:** Vite + React 18 + TypeScript strict, Vitest + Testing Library, Cloudflare Worker + D1, `qrcode`, WebCrypto, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-11-27-questionnaires-domicile-design.md`

## Global Constraints

- Ticket : 16 octets aléatoires (base64url), valable **14 jours**, **un seul dépôt** ; le relais ne garde que son SHA-256 (hex).
- Clé : 32 octets aléatoires, AES-GCM 256 (`importVaultKey`, `seal`, `open` de `src/bilan/storage/crypto.ts`). Jamais envoyée au relais.
- Lien : `<base>#/q?t=<ticket>&k=<clé base64url>&q=<ids,séparés,par,virgules>`.
- Dépôt : 64 Ko au plus (413 au-delà) ; 410 si le ticket est inconnu, expiré ou déjà utilisé.
- Bail de relève : 10 minutes.
- Aucun `localStorage` ni `sessionStorage` ; le brouillon du patient est dans IndexedDB (base `bilan-homeq`).
- La page du patient n'affiche ni le nom du patient ni celui de Yass ; elle ne montre aucun score.
- Questionnaires proposables : les 8 de `QUESTIONNAIRES` (NDI, QuickDASH, SPADI, CSI, TSK, PCS, FABQ, PSEQ). Défaut de zone : épaule `['spadi','quickdash']`, genou `[]`.
- Textes en français, tutoiement côté Yass, vouvoiement côté patient.

## Review Focus

1. **Bilan ouvert à l'écran quand les réponses arrivent** : elles apparaissent sans perdre la saisie en cours (remontage avec l'état fusionné), et le dépôt n'est supprimé qu'après l'enregistrement → test dans la tâche 3.
2. **Deux appareils synchronisent en même temps** : un seul relève (bail), aucune copie en conflit n'est créée → test du contrat de stockage (tâche 1) et du moteur (tâche 3).
3. **Lien rouvert après l'envoi ou après 14 jours** : message clair, aucun second dépôt → tests des tâches 1 et 5.
4. **Patient qui ferme la page à mi-chemin** : le brouillon revient avec le même lien → test de la tâche 5.
5. **Nouvel envoi alors que des réponses sont déjà reçues** : les anciennes restent ; un dépôt arrivé pour un ancien ticket remplacé est ignoré puis supprimé → test de la tâche 2 (réducteur) et de la tâche 3.

---

### Task 1: Relais — boîte aux lettres `home_q`

**Files:**
- Create: `relay/migrations/0003_home_q.sql`
- Modify: `relay/src/store.ts`, `relay/src/memoryStore.ts`, `relay/src/d1Store.ts`, `relay/src/handler.ts`
- Test: `tests/relay.helpers.ts` (contrat), `tests/relay.homeq.test.ts`

**Interfaces:**
- Produces (`RelayStore`) :
  - `addHomeTicket(hash: string, expiresAt: string, now: string): Promise<void>` (efface au passage les tickets expirés) ;
  - `submitHome(hash: string, box: string, now: string): Promise<boolean>` (vrai une seule fois, avant l'expiration) ;
  - `homeInbox(leaseBefore: string): Promise<string[]>` (empreintes déposées, non relevées ou bail expiré) ;
  - `claimHome(hash: string, device: string, now: string, leaseBefore: string): Promise<string | null>` (atomique ; renvoie la boîte) ;
  - `deleteHome(hash: string): Promise<void>`.
- Produces (routes) :
  - `POST /q/ticket` (protégée) → 201 `{ ticket, expiresAt }` ;
  - `POST /q/submit` (publique) `{ ticket, box: {iv, ct} }` → 201, 410 ou 413 ;
  - `GET /q/inbox` (protégée) → `{ hashes: string[] }` ;
  - `POST /q/claim/:hash` (protégée) → 200 `{ box }` ou 409 ;
  - `DELETE /q/:hash` (protégée) → 204.

- [ ] **Step 1: tests du contrat** (dans `storeContract` ; ajouter aussi la purge : un ticket expiré sans dépôt disparaît au prochain `addHomeTicket`)
  - `contrat : boîte aux lettres` : `addHomeTicket('h','2026-12-10T00:00:00.000Z', t0)` ; `submitHome('h','b', t1)` → true, puis false ; `submitHome('x',…)` → false.
  - Un ticket expiré → false.
  - `homeInbox(lease)` → `['h']` ; `claimHome('h','d1',now,lease)` → `'b'` ; un 2ᵉ `claimHome` dans le bail → null ; après le bail → `'b'`.
  - `deleteHome('h')` → `homeInbox` vide.
- [ ] **Step 2: tests de routes** (`tests/relay.homeq.test.ts`)
  - Ticket créé → dépôt 201 → 2ᵉ dépôt 410 ; dépôt sans jeton accepté.
  - Dépôt après 14 jours + 1 ms → 410 ; boîte > 64 Ko → 413 ; corps sans `box` valide → 400.
  - `inbox` sans jeton → 401 ; `claim` → 200 puis 409 pour un 2ᵉ appareil ; après 10 min + 1 ms → 200 ; `DELETE` → 204 puis `inbox` vide.
- [ ] **Step 3: lancer** `npx vitest run tests/relay.homeq.test.ts tests/relay.d1.test.ts tests/relay.handler.test.ts` → échecs attendus.
- [ ] **Step 4: implémenter**
  - Migration (`hash PK, expires_at, box NULL, claimed_by NULL, claimed_at NULL`).
  - Mémoire et D1 : D1 avec `UPDATE … WHERE box IS NULL AND expires_at > ?` et `UPDATE … WHERE claimed_at IS NULL OR claimed_at < ?`, en vérifiant `meta.changes`.
  - Routes dans `handler.ts` : le dépôt avant le contrôle du jeton, à côté de `/pair/redeem`.
- [ ] **Step 5: relancer** → vert.
- [ ] **Step 6: commit** `feat(relais): boîte aux lettres des questionnaires à domicile`

### Task 2: Lien, chiffrement, état du bilan, propositions

**Files:**
- Create: `src/bilan/homeq/link.ts`, `src/bilan/homeq/propose.ts`
- Modify:
  - `src/bilan/state/bilan.ts` ;
  - `src/bilan/storage/vault.ts` (méta) ;
  - `src/bilan/content/types.ts` (`ZoneDef.homeQuestionnaires?: readonly string[]`) ;
  - `src/bilan/content/shoulder.ts`, `knee.ts` ;
  - `src/bilan/sync/api.ts`.
- Test: `tests/bilan.homeq.test.ts`

**Interfaces:**
- Produces (`link.ts`) :
  - `HOMEQ_DAYS = 14` ;
  - `homeLink(base: string, p: { ticket: string; key: string; ids: readonly string[] }): string` ;
  - `parseHomeLink(hash: string): { ticket: string; key: string; ids: string[] } | null` (null si mal formé ; ids inconnus retirés) ;
  - `newHomeKey(): string` (base64url) ;
  - `sealAnswers(key: string, a: HomeAnswers): Promise<Box>` ;
  - `openAnswers(key: string, b: Box): Promise<HomeAnswers>` ;
  - `ticketHash(ticket: string): Promise<string>` (SHA-256 hex) ;
  - `type HomeAnswers = Record<string, Record<string, number>>`.
- Produces (`bilan.ts`) :
  - `HomeRequest { ticket; hash; key; ids: string[]; createdAt; expiresAt }` ;
  - `BilanState.homeQ: HomeRequest | null` ;
  - `BilanState.qResults: Record<string, { answers: Record<string, number>; at: string }>` ;
  - actions `{type:'homeQCreate', req: HomeRequest}`, `{type:'homeQReceived', hash: string, answers: HomeAnswers, at: string}`.
  - `homeQReceived` ne fait rien si `hash !== s.homeQ?.hash` ; sinon il fusionne `qResults` par questionnaire et met `homeQ` à null.
  - `normalizeBilan` met `homeQ: null` et `qResults: {}` si absents.
- Produces (méta) : `BilanMeta.homeQHash?: string`, `BilanMeta.qStatus?: 'pending' | 'received'` (en attente si `homeQ` non expiré, reçu si `qResults` non vide et rien en attente).
- Produces (`propose.ts`) : `proposeHomeQuestionnaires(z: ZoneDef, s: BilanState, suggestions: readonly Suggestion[]): string[]`. C'est l'union de :
  - les suggestions de type questionnaire ;
  - les règles questionnaire acceptées ;
  - les questionnaires IA ajoutés ;
  - `z.homeQuestionnaires`.
  Le résultat est filtré sur `QUESTIONNAIRES`, sans ceux déjà dans `qResults`, dans l'ordre de `QUESTIONNAIRES`.
- Produces (`api.ts`) : `homeTicket()`, `homeInbox()`, `homeClaim(hash)` → `Box | null`, `homeDone(hash)`, et `homeSubmit(relayUrl, ticket, box, f?)` (sans jeton, lève `RelayError`).

- [ ] **Step 1: tests**
  - Aller-retour `homeLink` / `parseHomeLink` (ids inconnus retirés ; `t` ou `k` manquant → null).
  - `sealAnswers` puis `openAnswers` restitue les réponses ; une mauvaise clé lève.
  - Réducteur : `homeQCreate` puis `homeQReceived` avec la bonne empreinte → `qResults.spadi` rempli, `homeQ` null. Avec une autre empreinte → état inchangé. Un 2ᵉ envoi garde `qResults.tsk` reçu avant.
  - `normalizeBilan` d'un ancien bilan → `homeQ` null, `qResults` `{}`.
  - Propositions : épaule vide → `['quickdash','spadi']` dans l'ordre de `QUESTIONNAIRES` ; avec la règle `peur-tsk` déclenchée → contient `tsk` ; `spadi` reçu → absent.
  - Méta : `qStatus` pending / received.
- [ ] **Step 2: lancer** `npx vitest run tests/bilan.homeq.test.ts` → échec.
- [ ] **Step 3: implémenter.**
- [ ] **Step 4: relancer** → vert ; `npx vitest run tests/bilan.state.test.ts tests/bilan.vault.test.ts` vert.
- [ ] **Step 5: commit** `feat(bilan): lien chiffré, état et propositions des questionnaires à domicile`

### Task 3: Relève pendant la synchronisation

**Files:**
- Create: `src/bilan/homeq/collect.ts`
- Modify: `src/bilan/sync/engine.ts` (`syncOnce` : étape 3), `src/bilan/ui/BilanRoot.tsx`
- Test: `tests/bilan.homeq.sync.test.ts`

**Interfaces:**
- Produces : `collectHomeAnswers(v: Vault, api: RelayApi, opts: { isOpen(id): boolean; applyOpen?(id: string, a: BilanAction): Promise<boolean> }): Promise<number>`. Il renvoie le nombre de bilans complétés.
  1. Si `inbox` est vide, il s'arrête.
  2. Il fait correspondre les empreintes via `v.list()` et `homeQHash`.
  3. Il relève la boîte (`homeClaim`) et la déchiffre avec `homeQ.key`.
  4. Il applique `homeQReceived` : par `applyOpen` si le bilan est ouvert, sinon `load` puis `save`.
  5. Il appelle `homeDone` seulement si l'enregistrement a réussi.
  6. Une empreinte qu'aucun bilan n'attend (ticket remplacé, ou bilan pas encore reçu) est laissée telle quelle. Le relais efface les dépôts 30 jours après leur expiration (`addHomeTicket` : tickets expirés sans dépôt, et dépôts expirés depuis plus de 30 jours).
  7. Un échec de déchiffrement → on laisse le dépôt.
- `syncOnce` accepte `applyOpen` et ajoute `homeReceived` au résultat ; les erreurs réseau de cette étape ne changent pas le statut « synchronisé » des bilans.
- `BilanRoot` : `applyOpen` fait :
  1. `flush()` ;
  2. applique l'action à `current.current` ;
  3. `vault.save` ;
  4. remonte l'écran d'édition (`rev + 1`) ;
  5. renvoie `true`.
  Si `homeReceived > 0` et que la liste est affichée, il la relit.

- [ ] **Step 1: tests** (relais en mémoire via `fetchFor`, coffre de test comme dans `tests/bilan.sync.test.ts`)
  - Dépôt pour un bilan fermé → après `syncOnce`, `load(id).qResults.spadi` rempli, `homeQ` null, `inbox` vide.
  - Bilan ouvert → `applyOpen` appelé avec `homeQReceived` ; s'il renvoie `false`, le dépôt reste.
  - Deux coffres reliés synchronisent → un seul applique, aucune copie en conflit (`list()` sans `conflictOf`).
  - Clé incorrecte → dépôt conservé.
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: implémenter.**
- [ ] **Step 4: relancer** → vert, avec `tests/bilan.sync*.test.ts`.
- [ ] **Step 5: commit** `feat(bilan): relève des questionnaires à domicile à la synchronisation`

### Task 4: Écran de Yass — envoi, suivi, réponses

**Files:**
- Create: `src/bilan/ui/HomeQPanel.tsx`
- Modify:
  - `src/bilan/ui/BilanApp.tsx` (bloc avant `BilanExport`, prop `homeQ?: { create(ids): Promise<HomeRequest> } | null`) ;
  - `src/bilan/ui/BilanRoot.tsx` (fournit `create` : `homeTicket`, `newHomeKey`, `ticketHash`, `expiresAt`) ;
  - `src/bilan/ui/PairingQr.tsx` (réutilisé pour le QR) ;
  - `src/bilan/ui/BilanList.tsx` (pastille) ;
  - `src/styles/styles.css`.
- Test: `tests/bilan.homeq.ui.test.tsx`

**Interfaces:** consomme `proposeHomeQuestionnaires`, `homeLink`, les actions de la tâche 2, `scoreQ` et `QUESTIONNAIRES`.

- [ ] **Step 1: tests**
  - Sans `homeQ` : texte « Active la synchronisation pour envoyer des questionnaires au patient. »
  - Épaule : cases SPADI et QuickDASH cochées, TSK non ; cocher TSK puis « Créer le QR code » → `create` appelé avec `['quickdash','spadi','tsk']`, puis un lien contenant `#/q?t=` s'affiche avec « Copier le lien » et « valable jusqu’au ».
  - Avec `homeQ` en attente : « En attente des réponses du patient » et « Nouvel envoi ».
  - Avec `qResults.spadi` : « Réponses du patient », le nom SPADI et le score affiché par `scoreQ`.
  - `BilanList` : la pastille « réponses reçues » ou « questionnaires en attente ».
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `feat(bilan): envoi des questionnaires à domicile et réponses dans le bilan`

### Task 5: Page du patient

**Files:**
- Create: `src/bilan/homeq/draft.ts`, `src/bilan/ui/PatientHomeQ.tsx`
- Modify: `src/Root.tsx` (route `#/q`, avant le reste ; jamais bloquée par le mode patient), `src/styles/styles.css`
- Test: `tests/bilan.homeq.patient.test.tsx`

**Interfaces:**
- `draft.ts` : `loadDraft(ticket): Promise<{ answers: HomeAnswers; sent?: boolean } | null>`, `saveDraft(ticket, d)`, `clearDraft(ticket)`. IndexedDB ; en cas d'échec, mémoire seulement.
- `PatientHomeQ({ hash, relayUrl, submit? })`. `submit` est injectable pour les tests ; il vaut par défaut `homeSubmit`. Le composant réutilise `QuestionnairePage` avec un `dispatch` local qui reçoit `qanswer`.

- [ ] **Step 1: tests**
  - Lien mal formé → « Ce lien n’est pas valable ».
  - Accueil « Questionnaires de votre physiothérapeute », « 2 questionnaires », « Commencer ».
  - Navigation page par page, avec la progression « Questionnaire 1 sur 2 ».
  - Réponses manquantes signalées à la fin sans bloquer ; « Envoyer à mon physiothérapeute » → `submit` reçoit une boîte que `openAnswers(key)` ouvre avec les réponses données.
  - Écran « Merci ».
  - `submit` qui lève une `RelayError(410)` → « Ce lien n’est plus valable. Demandez-en un nouveau à votre physiothérapeute. »
  - `TypeError` → message hors connexion et « Réessayer ».
  - Brouillon : réponses saisies, démontage, remontage → réponse toujours cochée. Après l'envoi, le remontage affiche « déjà envoyé ».
  - Aucun score affiché.
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `feat(bilan): page du patient pour les questionnaires à domicile`

### Task 6: Exports, IA, documentation, vérification

**Files:**
- Modify:
  - `src/bilan/engine/exports.ts` (fonction `questionnaireLines(s): string[]` : « SPADI : 46 % (Douleur …) » ; ajoutée au PDF sous le titre « Questionnaires » et au bloc SYSmeta « Anamnèse ») ;
  - `src/bilan/ai/summary.ts` (même lignes) ;
  - `docs/GUIDE-SYNCHRONISATION.md` (paragraphe « Questionnaires à domicile ») ;
  - `DECISIONS.md` (54–56) ;
  - `README.md`.
- Test: `tests/bilan.homeq.exports.test.ts`

- [ ] **Step 1: tests**
  - `questionnaireLines` avec `qResults.spadi` complet → une ligne commençant par le nom du SPADI et contenant le `display` de `scoreQ`.
  - Questionnaire incomplet → mention « incomplet » ou la note de `scoreQ`.
  - Le PDF contient le titre « Questionnaires » ; SYSmeta, le bloc Anamnèse ; le résumé de l'IA, la ligne.
- [ ] **Step 2: lancer → échec ; implémenter ; relancer → vert.**
- [ ] **Step 3: vérification complète** : `npm test`, `npm run lint`, `npx tsc -b`, `npm run build`. Parcours Playwright : création du QR, ouverture du lien sur un téléphone simulé, envoi via `relay:dev`, réponses dans le bilan.
- [ ] **Step 4: commit** `feat(bilan): questionnaires à domicile dans les exports ; documentation`
