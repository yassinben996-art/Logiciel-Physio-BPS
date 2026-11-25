# Synchronisation chiffrée entre appareils — document de conception

Date : 25.11.2026 · Auteur : Claude, avec Yassine Bensaid (Yass)
Statut : brouillon relu par un constructeur, à valider par Yass
Complète : `2026-11-24-bilan-standardise-design.md` (« la conception principale », §5.7 et §5bis). Ce qui n'est pas dit ici reste régi par elle.

## 1. Intention

Yass utilise le bilan sur sa tablette, son téléphone et son ordinateur. Aujourd'hui, chaque appareil a son propre coffre : un bilan commencé sur la tablette n'existe pas sur l'ordinateur. Il veut que **les données soient conservées quand il passe d'un appareil à l'autre** (demande du 25.11.2026).

C'est le premier rôle du relais prévu par la conception principale (§5.7.1). Yass a laissé à Claude le choix de l'ordre (« fais comme tu le sens ») : la synchronisation seule d'abord, l'IA ensuite sur le même relais.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un bilan créé ou modifié sur un appareil apparaît sur les autres appareils de Yass, sans geste de sa part.
- L'outil continue de marcher **hors connexion** ; la synchronisation se fait quand le réseau revient.
- Ajouter un appareil se fait une fois, en scannant un QR code affiché sur un appareil déjà relié (conception principale §5bis), ou en tapant un code si l'appareil n'a pas de caméra (ordinateur).
- Retirer un appareil (perdu, changé) depuis un autre appareil.

**Non-objectifs (pour ce plan)**
- L'IA, la bascule entre fournisseurs, « Copier pour Claude » : plan suivant, sur le même relais.
- Les questionnaires envoyés au patient par QR code et la réception de ses réponses : plus tard.
- L'historique et la comparaison au rebilan : plus tard (les bilans restent tous conservés, la comparaison viendra).
- Plusieurs utilisateurs ou le partage avec un collègue.

**Anti-objectifs** (échec même si « ça marche »)
- Le serveur peut lire un bilan, une identité ou une note (tout doit y arriver chiffré, la clé ne quitte jamais les appareils de Yass).
- Un bilan disparaît ou une saisie est écrasée sans que Yass le sache.
- L'outil devient inutilisable sans réseau, ou bloque la saisie en attendant le serveur.
- Un abonnement payant devient nécessaire.
- Un tiers qui connaît l'adresse du serveur peut y lire, écrire ou vider le quota.

## 3. Contraintes

- Toutes celles de la conception principale et des plans 1 et 1b : chiffrement AES-GCM 256, aucune donnée lisible hors des appareils, aucun `localStorage` ni `sessionStorage`, identité jamais envoyée à l'IA ni dans SYSmeta.
- **Gratuité** : hébergement dans une offre gratuite, sans carte bancaire si possible.
- **Données en Europe** (conception principale §5.7), sous réserve de vérification à la construction.
- Le site reste publié sur GitHub Pages (pas de changement d'hébergement de la page).
- Yass n'est pas développeur : chaque action qu'il doit faire lui-même (créer un compte, coller un jeton dans GitHub) est guidée pas à pas.

## 4. Approches considérées

| Approche | Résumé | Verdict |
|---|---|---|
| **A. Cloudflare Workers + D1 (UE)** | Petit serveur gratuit (Workers, 100 000 requêtes par jour) et base de données D1 créée avec la juridiction `eu` | **Retenue par Claude** (Yass : « fais comme tu le sens ») : gratuit, ne s'endort pas, données dans l'UE ; le même Worker relaiera l'IA ensuite |
| B. Supabase (Francfort) | Base de données gratuite en Europe | Écartée : l'offre gratuite met le projet en pause après une semaine sans activité (vacances) |
| C. Sans serveur | Export d'un fichier chiffré, ouvert sur l'autre appareil | Écartée : manuel, ne répond pas à « les données sont conservées » |

Sources : documentation Cloudflare D1 (emplacement des données, juridiction UE), documentation Supabase (mise en pause des projets gratuits), consultées le 25.11.2026. **À vérifier à la construction** : que la juridiction `eu` de D1 est disponible dans l'offre gratuite ; sinon, emplacement « Europe de l'Ouest » (`weur`), les données restant chiffrées.

## 5. Ce qui a été décidé

### 5.1 Une clé de coffre commune à tous les appareils (choix de Claude)
- Aujourd'hui, la clé du coffre est dérivée du PIN de l'appareil. Pour que plusieurs appareils lisent les mêmes bilans, il faut **une même clé de coffre** sur tous.
- On introduit une **clé de coffre aléatoire** (AES-GCM 256), créée sur le premier appareil. Sur chaque appareil, elle est stockée **enveloppée** par la clé dérivée du PIN de cet appareil. Chaque appareil peut donc avoir son propre PIN.
- **Migration** des coffres existants : au premier lancement de cette version, après le PIN, une clé de coffre est créée et les bilans locaux sont rechiffrés avec elle, sans rien perdre. Un test le vérifie.
- **Appareil qui a déjà des bilans au moment d'être relié** (cas de Yass : tablette, téléphone et ordinateur ont chacun les leurs) : ses bilans sont **fusionnés**, jamais remplacés. Après le scan, l'appareil déchiffre ses bilans avec son ancienne clé, les rechiffre avec la clé commune et les envoie au relais ; il reçoit ensuite ceux des autres. Le premier appareil (« Activer la synchronisation ») et les suivants passent par le même chemin de migration. *Décision de Claude, imposée par l'anti-objectif « un bilan disparaît ».*
- Un PIN oublié reste irrécupérable sur cet appareil, mais Yass peut réinstaller l'appareil en le reliant à nouveau depuis un autre appareil : les bilans reviennent du relais. *Conséquence positive de la synchronisation, à dire à Yass.*

### 5.2 Le relais (choix de Claude)
- Un Worker Cloudflare, dans un dossier `relay/` du dépôt, avec une base D1.
- Il ne stocke que, par bilan : l'identifiant (aléatoire), la fiche et le bilan **chiffrés**, la date de modification, un indicateur de suppression. Il ne connaît ni nom, ni code `B-…`, ni contenu.
- **Création du compte protégée** : le relais n'accepte qu'**un seul compte**, et seulement avec un **code d'installation** que Yass invente et enregistre comme secret du Worker (dans le même guide que le jeton Cloudflare). Il le tape une fois, à l'activation. Après la création du compte, plus aucune création n'est possible. *Décision de Claude : sans cela, n'importe qui connaissant l'adresse du relais (visible dans la page publique) pourrait remplir la base et vider le quota.*
- **Accès** : chaque appareil reçoit un **jeton d'appareil** long et aléatoire ; le relais n'en garde qu'une empreinte (hachage). Sans jeton valide, toute requête est refusée. Le relais limite le nombre de requêtes par appareil.
- Le code du relais est publié automatiquement par GitHub Actions quand il change sur `main`, avec un jeton Cloudflare que Yass enregistre une fois dans les secrets du dépôt (guidé pas à pas).

### 5.3 Relier un appareil (conception principale §5bis, détails de Claude)
- Sur le **premier appareil** : « Activer la synchronisation » crée le compte sur le relais et la clé de coffre.
- Pour **ajouter un appareil** : sur un appareil déjà relié, « Ajouter un appareil » affiche un **QR code**, valable 10 minutes et utilisable une seule fois, et le même contenu sous forme de **code à taper** (pour un ordinateur sans caméra). Le QR contient un ticket d'appairage et la clé de coffre ; **la clé ne passe jamais par le relais**. Conséquence assumée : le code à taper est long (68 caractères, présentés en 17 groupes de 4, par exemple `K7QF-2MXA-…`, avec contrôle de faute de frappe). On ne le tape qu'une fois par ordinateur. *Décision de Claude : un code court obligerait à faire transiter la clé par le relais.*
- Le nouvel appareil scanne (ou tape le code), choisit son PIN, reçoit son jeton et télécharge les bilans.
- « Mes appareils » liste les appareils reliés (nom choisi, date du dernier contact) et permet d'en **retirer** un : son jeton est révoqué sur le relais. *Limite à dire à Yass : un appareil retiré garde les bilans déjà présents sur lui, protégés par son PIN.*

### 5.4 Quand et comment ça se synchronise
- **Envoi** : après chaque enregistrement local (déjà automatique, 500 ms après la dernière saisie).
- **Réception** : au déverrouillage, au retour sur l'onglet ou l'application, et toutes les 60 secondes tant que l'outil est ouvert.
- **Conflits** (même bilan modifié sur deux appareils sans connexion) : la version la plus récente gagne, bilan par bilan. « Plus récente » se juge avec un **numéro de version attribué par le relais** (pas l'horloge des appareils, qui peut être fausse) : un appareil envoie la version sur laquelle il a travaillé ; si le relais a reçu entre-temps une autre version, il y a conflit.
- **Bilan ouvert à l'écran** : il n'est **jamais remplacé** pendant que Yass l'édite. Si une version plus récente arrive d'un autre appareil, la version ouverte continue d'être enregistrée ; l'autre est gardée comme copie en conflit, et un message le signale. *Choix de Claude, simple et compréhensible ; un bilan est en pratique rempli sur un seul appareil à la fois.* L'autre version n'est pas perdue en silence : elle est gardée comme copie, visible dans « Mes bilans » (« copie en conflit, du JJ.MM à HH:MM »). Yass peut la supprimer.
- **Suppression** : supprimer un bilan le supprime partout.
- **Indicateur** dans l'en-tête : « Synchronisé », « Synchronisation… », « Hors connexion : les modifications partiront au retour du réseau », ou une erreur.
- Sans synchronisation activée, l'outil fonctionne exactement comme aujourd'hui.

### 5.5 Sécurité de la page
- La page ne peut parler qu'à l'adresse du relais (ajout de cette seule adresse à `connect-src` dans les politiques de sécurité existantes de Netlify et Vercel, et dans la page si besoin).
- Aucune donnée ne part avant que la synchronisation soit activée par Yass.

## 6. Ce qui est laissé au constructeur

- Le schéma exact de la base D1, des routes du relais et des messages.
- Le format du QR code et du code à taper, et la bibliothèque de lecture du QR code (caméra) et de génération.
- La limite de requêtes et sa valeur, dans les limites de l'offre gratuite.
- La façon de tester le relais localement (sans compte Cloudflare) et le découpage en tâches.
- Le guide pas à pas pour Yass (compte Cloudflare, jeton, secret GitHub), à écrire dans le dépôt et à lui transmettre.
