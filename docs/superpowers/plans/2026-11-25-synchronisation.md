# Synchronisation chiffrée entre appareils — plan d'implémentation 2a

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les bilans de Yass se retrouvent sur sa tablette, son téléphone et son ordinateur, chiffrés de bout en bout via un petit relais Cloudflare gratuit, sans gêner l'usage hors connexion.

**Architecture:** Un Worker Cloudflare (`relay/`) écrit en TypeScript sans dépendance. Sa logique est une fonction pure `handle(req, env, store)` testée en Node avec un stockage en mémoire, et branchée en production sur D1. Côté app, le coffre IndexedDB passe à une **clé de coffre aléatoire** enveloppée par le PIN de chaque appareil. Un moteur de synchronisation (`src/bilan/sync/`) pousse les enregistrements chiffrés modifiés et tire ceux des autres appareils, avec un numéro de version attribué par le relais. L'appairage passe par un lien `#/bilan/relier?c=…` : le QR code s'ouvre avec l'appareil photo, ou le code est tapé à la main.

**Tech Stack:** Vite, React 18, TypeScript strict, Vitest (existants) ; Cloudflare Workers + D1 ; `qrcode` (génération du QR) ; `wrangler` en CI seulement.

**Spec:** `docs/superpowers/specs/2026-11-25-synchronisation-design.md`

## Global Constraints

- Toutes les contraintes globales des plans 1 et 1b restent valables : AES-GCM 256, aucun `localStorage` ni `sessionStorage`, identité jamais dans SYSmeta, PDDM et `tests/parity.test.ts` intacts, lint sans avertissement, typecheck et tests verts avant chaque commit.
- **La clé de coffre ne passe jamais par le relais.** Le relais ne reçoit que des `Box` chiffrées (`{ iv, ct }`), des identifiants aléatoires, des numéros de version et des indicateurs de suppression.
- Aucune requête réseau tant que Yass n'a pas activé la synchronisation ou relié l'appareil.
- Un seul compte sur le relais, créé seulement avec le code d'installation (`RELAY_SETUP_CODE`, secret du Worker) ; ensuite, plus aucune création.
- Jetons d'appareil : 32 octets aléatoires, encodés en base64url ; le relais n'en garde que l'empreinte SHA-256.
- Ticket d'appairage : utilisable une seule fois, valable 10 minutes.
- Conflits : version attribuée par le relais ; un bilan ouvert à l'écran n'est jamais remplacé ; la version perdante est gardée comme « copie en conflit ».
- Réception : au déverrouillage, au retour sur l'app (`visibilitychange` → visible), toutes les 60 s ; envoi après chaque enregistrement local.
- Textes de l'indicateur, exacts : « Synchronisé », « Synchronisation… », « Hors connexion : les modifications partiront au retour du réseau », « Erreur de synchronisation ».
- Libellé d'une copie : « copie en conflit, du JJ.MM à HH:MM ».
- Versions exactes : `qrcode@1.5.4`, `@types/qrcode@1.5.5`, `wrangler@4.20.0` (CI seulement, via `npx`).

## Review Focus

1. **Coffre existant (plans 1 et 1b) à la mise à jour** : après le PIN, tous les bilans s'ouvrent comme avant (migration vers la clé de coffre), et un mauvais PIN dit toujours « PIN incorrect ». → test dans la tâche 3.
2. **Relier un appareil qui a déjà ses propres bilans** : aucun bilan n'est perdu ; après la synchronisation, les deux appareils ont l'union. → test dans la tâche 5.
3. **Réseau coupé au milieu d'une synchronisation** (`fetch` qui échoue, réponse 500) : la saisie locale continue, l'indicateur dit « Hors connexion… », et l'essai suivant envoie ce qui restait. → test dans la tâche 5.
4. **Lien d'appairage expiré, déjà utilisé ou mal tapé** (une lettre fausse) : message clair (« Code expiré ou déjà utilisé », « Code incorrect : vérifie la saisie »), pas de plantage, rien n'est envoyé. → tests dans les tâches 1, 4 et 6.
5. **Un tiers qui connaît l'adresse du relais** : sans jeton, toutes les routes renvoient 401 ; `/setup` renvoie 403 sans le bon code ou si le compte existe déjà ; un appareil retiré reçoit 401. → test dans la tâche 1.

---

### Task 1: Relais — logique et stockage en mémoire

**Files:**
- Create: `relay/src/handler.ts`, `relay/src/store.ts`, `relay/src/memoryStore.ts`
- Create: `tsconfig.relay.json` (lib ES2022 + WebWorker, `include: ["relay/src"]`), référencé dans `tsconfig.json`
- Test: `tests/relay.handler.test.ts` (en tête : `// @vitest-environment node`)

**Interfaces:**
- Produces, dans `store.ts` :

```ts
export interface DeviceRow { id: string; name: string; tokenHash: string; createdAt: string; lastSeen: string; revoked: boolean }
export interface RecordRow { id: string; meta: string; data: string; version: number; seq: number; deleted: boolean } // meta, data : JSON d'une Box
export interface RelayStore {
  hasAccount(): Promise<boolean>;
  createAccount(device: DeviceRow): Promise<void>;          // échoue si un compte existe
  deviceByTokenHash(h: string): Promise<DeviceRow | null>;
  addDevice(d: DeviceRow): Promise<void>;
  listDevices(): Promise<DeviceRow[]>;
  revokeDevice(id: string): Promise<void>;
  touchDevice(id: string, at: string): Promise<void>;
  addTicket(hash: string, expiresAt: string): Promise<void>;
  useTicket(hash: string, now: string): Promise<boolean>;   // vrai une seule fois, si non expiré
  getRecord(id: string): Promise<RecordRow | null>;
  putRecord(r: Omit<RecordRow, 'seq'>): Promise<number>;    // renvoie le nouveau seq (séquence globale croissante)
  recordsSince(seq: number, limit: number): Promise<RecordRow[]>;
}
```

- Produces : `handle(req: Request, env: { RELAY_SETUP_CODE: string; ALLOWED_ORIGIN: string }, store: RelayStore, now?: () => Date): Promise<Response>` dans `handler.ts` ; `MemoryStore implements RelayStore`.
- Routes (JSON, CORS pour `ALLOWED_ORIGIN` et `http://localhost:5173`, `OPTIONS` → 204) :
  - `POST /setup` `{ setupCode, deviceName }` → 201 `{ deviceId, token }` ; 403 si le code est faux ou si un compte existe.
  - `POST /pair/ticket` (auth) → 201 `{ ticket, expiresAt }` ; ticket de 8 octets, renvoyé en base64url, valable 10 min.
  - `POST /pair/redeem` `{ ticket, deviceName }` → 201 `{ deviceId, token }` ; 410 si le ticket est expiré, déjà utilisé ou inconnu.
  - `GET /devices` (auth) → `{ devices: [{ id, name, lastSeen, current }] }` (non retirés).
  - `DELETE /devices/:id` (auth) → 204.
  - `GET /records?since=<seq>` (auth) → `{ records: RecordRow[], cursor }`, 200 enregistrements au plus.
  - `PUT /records/:id` (auth) `{ baseVersion, meta, data, deleted }` → 200 `{ version, seq }` si `baseVersion` égale la version courante (0 pour un nouvel enregistrement) ; sinon 409 `{ current: RecordRow }`.
- Auth : `Authorization: Bearer <token>`. Token absent, inconnu ou appareil retiré → 401. Corps de plus de 2 Mo → 413. Plus de 120 requêtes par minute et par appareil (compteur en mémoire de l'isolat) → 429. `id` d'enregistrement : `[A-Za-z0-9-]{1,64}`, sinon 400.

- [ ] **Step 1: Write the failing tests** (`relay.handler.test.ts`, avec `MemoryStore` et une horloge injectée) :
  - `/setup` avec un mauvais code → 403 ; avec le bon → 201 et un token ; un second `/setup` avec le bon code → 403 ;
  - `GET /records` sans token → 401, avec un token faux → 401 ;
  - `PUT /records/a1` `baseVersion: 0` → 200 `version: 1` ; refaire avec `baseVersion: 0` → 409 avec `current.version === 1` ; avec `baseVersion: 1` → `version: 2` ;
  - `GET /records?since=0` → les enregistrements dans l'ordre de `seq`, et `cursor` égal au dernier `seq` ; `since=cursor` → `[]` ;
  - ticket : `redeem` → 201 ; second `redeem` du même ticket → 410 ; ticket créé puis horloge avancée de 11 min → 410 ;
  - `DELETE /devices/<id du 2e appareil>` → ensuite, ce token reçoit 401 ;
  - `OPTIONS` → 204 avec `Access-Control-Allow-Origin` égal à l'origine autorisée ; une origine inconnue ne reçoit pas cet en-tête ;
  - corps de 2,5 Mo → 413 ; 121e requête dans la minute → 429 ;
  - `PUT /records/../x` → 400.
- [ ] **Step 2: Run** `npx vitest run tests/relay.handler.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.** Empreinte : `crypto.subtle.digest('SHA-256')` en hexadécimal. Comparaisons de codes à temps constant.
- [ ] **Step 4: Run** le même test, puis `npm run typecheck`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(relais): logique du relais et stockage en mémoire`.

### Task 2: Relais — D1, déploiement et guide pour Yass

**Files:**
- Create: `relay/src/d1Store.ts` (`D1Store implements RelayStore`), `relay/src/index.ts` (`export default { fetch(req, env) { return handle(req, env, new D1Store(env.DB)) } }`)
- Create: `relay/migrations/0001_init.sql` (tables `devices`, `tickets`, `records`, `meta` ; `records.seq` venant d'une séquence globale tenue dans `meta`)
- Create: `relay/wrangler.toml` (nom `bilan-relay`, `main = "src/index.ts"`, `compatibility_date = "2025-06-01"`, `[vars] ALLOWED_ORIGIN = "https://yassinben996-art.github.io"`, `[[d1_databases]] binding = "DB"`, `database_name = "bilan-relay"`, `database_id = "__D1_ID__"`, `migrations_dir = "migrations"`)
- Create: `.github/workflows/relay.yml`
- Create: `docs/GUIDE-SYNCHRONISATION.md`
- Test: `tests/relay.d1.test.ts` (`// @vitest-environment node`)

**Interfaces:**
- Consumes : `RelayStore`, `handle` (tâche 1).
- `relay.yml` : déclenché par `push` sur `main` (chemins `relay/**` et le workflow lui-même) et par `workflow_dispatch`. Secrets : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RELAY_SETUP_CODE`. Étapes :
  1. Trouver la base `bilan-relay` (`npx wrangler@4.20.0 d1 list --json`) ; sinon la créer avec `--jurisdiction=eu`, et en cas d'échec avec `--location=weur`.
  2. Remplacer `__D1_ID__` dans `wrangler.toml`.
  3. `d1 migrations apply bilan-relay --remote`.
  4. `deploy`.
  5. `secret put RELAY_SETUP_CODE` à partir du secret GitHub.
  6. Afficher l'adresse du Worker dans le résumé du job.
- `deploy.yml` : `npm run build` reçoit `VITE_RELAY_URL: ${{ vars.RELAY_URL }}`.
- Le guide, en français, au tutoiement, une action par étape, avec où cliquer : créer le compte Cloudflare gratuit ; relever l'Account ID ; créer un jeton d'API (modèle « Edit Cloudflare Workers » + permission D1 « Edit ») ; ajouter les 3 secrets dans GitHub (Settings → Secrets and variables → Actions) ; lancer le workflow « Relais » ; copier l'adresse affichée dans la variable `RELAY_URL` (onglet Variables) ; relancer « Déploiement GitHub Pages ». Le code d'installation est une phrase qu'il invente et note.

- [ ] **Step 1: Write the failing test** (`relay.d1.test.ts`) : avec un faux D1 en mémoire qui ne sait exécuter que les requêtes SQL de `d1Store.ts`, ou, plus simplement, en vérifiant que `D1Store` passe la même suite de comportements que `MemoryStore`. Extraire de la tâche 1 une fonction `storeContract(make: () => RelayStore)` exécutée sur les deux. Le faux D1 utilise `node:sqlite` (Node 22) s'il est disponible, sinon le test est marqué `skip` avec un message.
- [ ] **Step 2: Run** `npx vitest run tests/relay.d1.test.ts`. Attendu : FAIL (module introuvable).
- [ ] **Step 3: Implement** `D1Store`, la migration, `index.ts`, `wrangler.toml`, `relay.yml`, la modification de `deploy.yml` et le guide.
- [ ] **Step 4: Run** `npx vitest run tests/relay.d1.test.ts && npm run typecheck && npm run lint`. Attendu : PASS (ou `skip` documenté pour `node:sqlite`).
- [ ] **Step 5: Commit** `feat(relais): base D1, déploiement automatique et guide d'installation`.

### Task 3: Coffre — clé de coffre, migration, métadonnées de synchronisation

**Files:**
- Modify: `src/bilan/storage/vault.ts`, `src/bilan/storage/crypto.ts`
- Test: `tests/bilan.vault.test.ts` (compléter)

**Interfaces:**
- `crypto.ts` gagne : `importVaultKey(raw: Uint8Array): Promise<CryptoKey>` (AES-GCM, non extractible) et `randomVaultKey(): Uint8Array` (32 octets).
- Méta du coffre : `salt` (inchangé), `check` (scellé par la clé du PIN, inchangé), `vaultKey` (les 32 octets de la clé de coffre, en base64, scellés par la clé du PIN), `sync` (configuration, scellée par la clé de coffre).
- Enregistrement d'un bilan : `{ meta: Box; data: Box; sync: { version: number; dirty: boolean; deleted: boolean } }`. Le bloc `sync` est en clair : ce sont des métadonnées techniques, sans donnée patient (voir le Ruling attendu dans le registre).
- `BilanMeta` gagne `conflictOf?: string; conflictAt?: string`.
- Options : `hasVault(o?: VaultOpts)`, `createVault(pin, o?)`, `unlockVault(pin, o?)`, avec `interface VaultOpts { idb?: IDBFactory }` (par défaut le `indexedDB` global ; sert aux tests à deux appareils).
- `Vault` gagne :

```ts
keyBytes(): Uint8Array;                                        // pour le QR d'appairage
adoptKey(raw: Uint8Array): Promise<void>;                      // rechiffre tout avec cette clé (fusion), rescelle vaultKey
getSyncConfig<T>(): Promise<T | null>; setSyncConfig<T>(c: T | null): Promise<void>;
pending(): Promise<{ id: string; meta: Box; data: Box; version: number; deleted: boolean }[]>;   // dirty
markSynced(id: string, version: number): Promise<void>;        // dirty = false (sauf si modifié entre-temps : comparer)
applyRemote(r: { id: string; meta: Box; data: Box; version: number; deleted: boolean }, isOpen: boolean): Promise<'applied' | 'copied' | 'skipped'>;
keepAsConflictCopy(id: string, at: string): Promise<string>;   // duplique le bilan local sous un nouvel id, marqué conflit, dirty ; renvoie le nouvel id
```

- `save` met `dirty: true` et garde `version`. `remove` laisse une tombe (`deleted: true`, `dirty: true`, données vidées) ; `list` et `load` ignorent les tombes.
- `applyRemote` :
  - pas d'enregistrement local, ou local non modifié → le remplace (`version` = distante, `dirty: false`) → `'applied'` ;
  - local modifié et non ouvert → `'skipped'` (l'envoi tranchera par 409) ;
  - bilan ouvert (`isOpen`) et version distante différente de la locale → la version distante est enregistrée comme copie en conflit (nouvel id, `conflictOf`, `conflictAt`), et le local garde `version` = distante pour pouvoir écraser au prochain envoi → `'copied'`.
- Migration : `unlockVault` sur un coffre sans `vaultKey` crée la clé de coffre, rechiffre tous les enregistrements (ancienne clé = clé du PIN), ajoute `sync: { version: 0, dirty: true, deleted: false }` et enregistre `vaultKey`.

- [ ] **Step 1: Write the failing tests** :
  - un coffre au format du plan 1b (créé en écrivant à la main `salt`, `check` et des enregistrements scellés par la clé du PIN, sans `vaultKey`) → `unlockVault('123456')` → `list()` et `load()` rendent les bilans ; `vaultKey` existe ensuite ; `unlockVault('000000')` → « PIN incorrect » ;
  - deux appareils (deux `IDBFactory`) : A `save(b)`, B `adoptKey(A.keyBytes())`, puis B `applyRemote(<enregistrement pending de A>)` → B `load(b.id)` égal à b ;
  - B a ses propres bilans **avant** `adoptKey` → ils restent lisibles après (Review Focus 2, partie locale) ;
  - `save` → `pending()` le contient ; `markSynced(id, 3)` → n'y est plus ; `save` à nouveau → `pending()` avec `version: 3` ;
  - `remove` → `load` → `null`, `list` ne le montre plus, `pending()` contient une tombe `deleted: true` ;
  - `applyRemote` sur un bilan ouvert avec une version distante plus récente → `'copied'`, `list()` montre deux entrées, dont une avec `conflictOf` ; le bilan ouvert est inchangé ;
  - `getSyncConfig()` → `null` ; `setSyncConfig({ token: 'x' })` puis relecture → `{ token: 'x' }` ; le contenu brut d'IndexedDB ne contient pas `'x'` en clair à côté de `token`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.vault.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Attendu : PASS (les tests existants du coffre et de `BilanRoot` restent verts).
- [ ] **Step 5: Commit** `feat(bilan): clé de coffre commune et métadonnées de synchronisation`.

### Task 4: Code et lien d'appairage

**Files:**
- Create: `src/bilan/sync/pairing.ts`
- Test: `tests/bilan.pairing.test.ts`

**Interfaces:**
- Produces :

```ts
export interface PairingPayload { ticket: Uint8Array /* 8 octets */; key: Uint8Array /* 32 octets */ }
export function encodePairing(p: PairingPayload): string;   // base32 Crockford, groupes de 4 séparés par « - », + 1 groupe de contrôle
export function decodePairing(code: string): PairingPayload; // tolère minuscules, espaces, O/0, I/L/1 ; lève Error('Code incorrect : vérifie la saisie')
export function pairingLink(code: string, base: string): string;      // `${base}#/bilan/relier?c=${code}`
export function codeFromHash(hash: string): string | null;             // lit c= dans « #/bilan/relier?c=… »
```

- Contrôle : CRC-16/CCITT des 40 octets, encodé dans le dernier groupe.

- [ ] **Step 1: Write the failing tests** : aller-retour `decodePairing(encodePairing(p))` ; format `/^([0-9A-Z]{4}-){16}[0-9A-Z]{4}$/` ; en minuscules, avec espaces au lieu des tirets et `O` au lieu de `0` → décode ; une lettre changée → « Code incorrect : vérifie la saisie » ; `codeFromHash('#/bilan/relier?c=AB12-…')` → le code ; `codeFromHash('#/bilan')` → `null`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.pairing.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): code et lien d'appairage`.

### Task 5: Client du relais et moteur de synchronisation

**Files:**
- Create: `src/bilan/sync/api.ts`, `src/bilan/sync/engine.ts`
- Test: `tests/bilan.sync.test.ts` (`// @vitest-environment node`, avec `fake-indexeddb` importé)

**Interfaces:**
- Consumes : `Vault` (tâche 3), `pairing` (tâche 4), `handle` + `MemoryStore` (tâche 1, uniquement dans les tests, via `fetchFor(store)` qui appelle `handle` au lieu du réseau).
- Produces :

```ts
// api.ts
export interface SyncConfig { relayUrl: string; deviceId: string; deviceName: string; token: string; cursor: number }
export class RelayError extends Error { constructor(public status: number, msg: string) }
export function relayApi(relayUrl: string, token: string | null, f?: typeof fetch): {
  setup(setupCode: string, deviceName: string): Promise<{ deviceId: string; token: string }>;
  ticket(): Promise<{ ticket: string; expiresAt: string }>;
  redeem(ticket: string, deviceName: string): Promise<{ deviceId: string; token: string }>;
  devices(): Promise<{ id: string; name: string; lastSeen: string; current: boolean }[]>;
  revoke(id: string): Promise<void>;
  since(cursor: number): Promise<{ records: RemoteRecord[]; cursor: number }>;
  put(id: string, baseVersion: number, meta: Box, data: Box, deleted: boolean): Promise<{ version: number } | { conflict: RemoteRecord }>;
};
// engine.ts
export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline' | 'error';
export const SYNC_LABEL: Record<Exclude<SyncStatus, 'off'>, string>; // textes exacts des Global Constraints
export async function activateSync(v: Vault, relayUrl: string, setupCode: string, deviceName: string, f?: typeof fetch): Promise<void>;
export async function createPairingCode(v: Vault, f?: typeof fetch): Promise<{ code: string; expiresAt: string }>;
export async function linkDevice(v: Vault, relayUrl: string, code: string, deviceName: string, f?: typeof fetch): Promise<void>; // adoptKey puis redeem
export async function syncOnce(v: Vault, opts: { isOpen: (id: string) => boolean; f?: typeof fetch }): Promise<{ status: SyncStatus; copied: number }>;
```

- `syncOnce` : envoie chaque `pending()` (409 → `applyRemote(conflict, isOpen)` ; si le bilan n'est pas ouvert, le local devient une copie en conflit via `keepAsConflictCopy`, puis la version distante est appliquée ; si le bilan est ouvert, renvoyer avec `baseVersion` = version distante) ; puis tire `since(cursor)` et appelle `applyRemote` pour chaque enregistrement ; enregistre le nouveau `cursor`. Une erreur réseau ou une réponse 5xx → `'offline'`, et rien n'est marqué synchronisé. Une réponse 401 → `'error'`.
- `linkDevice` messages : 410 → `Error('Code expiré ou déjà utilisé')`.

- [ ] **Step 1: Write the failing tests** (un relais `MemoryStore`, deux appareils A et B avec leurs propres `IDBFactory`) :
  - A `activateSync` avec un mauvais code d'installation → rejette ; avec le bon → `getSyncConfig()` renseigné ;
  - A crée un bilan, `syncOnce` → `'synced'` ; A `createPairingCode` ; B, qui a déjà un bilan à lui, `linkDevice` puis `syncOnce` ; A `syncOnce` → **A et B listent les deux bilans** (Review Focus 2) ;
  - B relie le même code une seconde fois → « Code expiré ou déjà utilisé » ;
  - A modifie le bilan, synchronise ; B synchronise → B lit la modification ;
  - A supprime, synchronise ; B synchronise → B ne le liste plus ;
  - conflit : A et B modifient le même bilan sans synchroniser ; A synchronise, puis B synchronise → B a la version de A **et** une copie en conflit contenant sa propre saisie ; A synchronise → A voit aussi la copie ;
  - bilan ouvert sur B : même scénario avec `isOpen` vrai sur B → la saisie de B reste le bilan principal, et la version de A devient la copie ;
  - réseau coupé (`f` qui rejette) → `'offline'`, `pending()` inchangé ; réseau rétabli → `'synced'` et `pending()` vide (Review Focus 3) ;
  - réponse 500 du relais → `'offline'` ;
  - appareil retiré par A → `syncOnce` de B → `'error'`.
- [ ] **Step 2: Run** `npx vitest run tests/bilan.sync.test.ts`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(bilan): moteur de synchronisation chiffrée`.

### Task 6: Écrans de synchronisation et déclencheurs

**Files:**
- Create: `src/bilan/ui/SyncPanel.tsx` (dans « Mes bilans »), `src/bilan/ui/PairingQr.tsx`
- Create: `src/bilan/sync/config.ts` (`export const RELAY_URL: string = import.meta.env.VITE_RELAY_URL ?? ''`)
- Modify: `src/bilan/ui/BilanRoot.tsx`, `src/bilan/ui/BilanList.tsx`, `src/Root.tsx` (la route accepte tout hash qui commence par `#/bilan`), `src/vite-env.d.ts` (type de `VITE_RELAY_URL`), `netlify.toml` et `vercel.json` (`connect-src 'self' https://*.workers.dev`), `package.json` (`qrcode`, `@types/qrcode`), `src/styles/styles.css`
- Test: `tests/bilan.syncui.test.tsx`

**Interfaces:**
- Consumes : tâches 3 à 5. Dans les tests, le `fetch` global est remplacé par `fetchFor(store)` et `RELAY_URL` par un module simulé (`vi.mock('../src/bilan/sync/config', …)`).
- Comportement :
  - **« Mes bilans » → section « Synchronisation »** :
    - si `RELAY_URL` est vide : « La synchronisation n'est pas encore installée (voir le guide). » ;
    - sinon, si la synchronisation n'est pas active : boutons « Activer la synchronisation » (formulaire « Code d'installation » et « Nom de cet appareil », bouton « Activer ») et « Relier à mes autres appareils » (champ « Code d'appairage », bouton « Relier ») ;
    - si elle est active : l'indicateur, « Synchroniser maintenant », « Ajouter un appareil » (affiche le QR du lien d'appairage, le code en groupes, « Valable 10 minutes, une seule fois ») et « Mes appareils » (nom, dernier contact, « Retirer » avec confirmation intégrée ; l'appareil courant est marqué « cet appareil » et ne peut pas se retirer lui-même).
  - **Route `#/bilan/relier?c=…`** : le code est lu puis retiré de l'adresse (`history.replaceState` vers `#/bilan`). Après le PIN (création ou déverrouillage), l'écran « Relier cet appareil » montre le champ « Nom de cet appareil » et le bouton « Relier ». En cas de succès, on affiche « Mes bilans » après la première synchronisation.
  - **Déclencheurs dans `BilanRoot`** : `syncOnce` après chaque `flush` réussi (sans attendre, une seule exécution à la fois, avec une relance si une demande arrive pendant l'exécution), au déverrouillage, au retour visible, et toutes les 60 s quand le coffre est déverrouillé. `isOpen(id)` est vrai pour le bilan à l'écran. Après une synchronisation, « Mes bilans » se rafraîchit s'il est affiché. Si `copied > 0` pour le bilan ouvert : « Une autre version de ce bilan est arrivée d'un autre appareil : elle est gardée comme copie dans Mes bilans. »
  - **En-tête du bilan** : le texte de l'indicateur à côté de « Enregistré ».
  - Une copie en conflit apparaît dans la liste avec « copie en conflit, du JJ.MM à HH:MM ».

- [ ] **Step 1: Write the failing tests** :
  - sans `RELAY_URL` : le texte « pas encore installée » ;
  - avec : « Activer la synchronisation », mauvais code → « Code d'installation incorrect », bon code → l'indicateur « Synchronisé » ;
  - « Ajouter un appareil » → un `<svg>` ou un `<img>` de QR code, et un code qui correspond au format de la tâche 4 ;
  - un second `BilanRoot` (autre `IDBFactory`), ouvert sur `#/bilan/relier?c=<code>` → PIN, « Relier » → son « Mes bilans » liste le bilan de A ; `location.hash` ne contient plus le code ;
  - code mal tapé dans « Relier à mes autres appareils » → « Code incorrect : vérifie la saisie » (Review Focus 4) ;
  - « Mes appareils » liste deux appareils ; « Retirer » sur l'autre, puis confirmation → il disparaît ;
  - une copie en conflit s'affiche avec « copie en conflit, du ».
- [ ] **Step 2: Run** `npx vitest run tests/bilan.syncui.test.tsx`. Attendu : FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 5: Commit** `feat(bilan): écrans de synchronisation et appairage par QR code`.

### Task 7: Vérification de bout en bout et documentation

**Files:**
- Create: `relay/dev-server.ts` (serveur Node local : `handle` + `MemoryStore` sur `http://localhost:8787`, code d'installation `dev`) et un script `npm run relay:dev` (`tsx relay/dev-server.ts`)
- Modify: `DECISIONS.md` (entrées 47 à 50 : relais Cloudflare et données dans l'UE ; clé de coffre commune et migration ; appairage par lien ou code, la clé ne passant jamais par le relais ; conflits et copies)
- Modify: `README.md` (une ligne vers le guide)

- [ ] **Step 1: Vérification manuelle.**
  - Lancer `npm run relay:dev`, puis `VITE_RELAY_URL=http://localhost:8787 npm run dev`.
  - Avec Playwright, ouvrir **deux contextes de navigateur** (deux appareils) :
    1. A : PIN, « Activer la synchronisation » avec le code `dev`, créer un bilan ;
    2. A : « Ajouter un appareil », lire le lien ;
    3. B : ouvrir le lien, PIN, « Relier » → le bilan de A apparaît ;
    4. modifier sur B → apparaît sur A au retour sur l'onglet ;
    5. couper le relais → « Hors connexion… », puis le relancer → « Synchronisé ».
  - Captures à 1024 et 390 px ; aucune erreur dans la console.
- [ ] **Step 2: Run** `npm test && npm run lint && npm run typecheck && npm run build`. Attendu : tout est vert.
- [ ] **Step 3: Commit** `docs(bilan): décisions et vérification de la synchronisation`.

---

## Après ce plan (actions de Yass, guidées)

Suivre `docs/GUIDE-SYNCHRONISATION.md` : compte Cloudflare, 3 secrets et 1 variable dans GitHub, lancement du workflow « Relais ». Le relais ne peut être déployé qu'avec son compte : Claude n'y a pas accès.

## Plans suivants

2b. **IA** (Groq, bascule automatique, nettoyage des noms, « Copier pour Claude ») sur le même relais. 3. Questionnaires par QR code. 4. PDDM, lombaire, cervical, douleur chronique.
