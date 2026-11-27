# Installer la synchronisation entre tes appareils

Ce guide se fait **une seule fois**, sur ton ordinateur, en 15 minutes environ. Ensuite, tes bilans se retrouvent sur ta tablette, ton téléphone et ton ordinateur.

Ce que tu installes : un petit serveur gratuit chez Cloudflare, qui garde tes bilans **chiffrés**. Le serveur ne peut pas les lire : la clé reste sur tes appareils.

Tu vas créer un compte Cloudflare, puis copier quatre informations dans GitHub. Garde ce guide ouvert à côté.

---

## Étape 1 : créer le compte Cloudflare (gratuit)

1. Va sur https://dash.cloudflare.com/sign-up
2. Entre ton adresse e-mail et un mot de passe, puis confirme ton adresse avec l'e-mail reçu.
3. Si Cloudflare te propose un abonnement, choisis l'offre **Free** (gratuite). Aucune carte bancaire n'est nécessaire.

## Étape 2 : activer les « Workers »

1. Dans le menu de gauche, clique **Workers & Pages** (parfois sous « Compute »).
2. Si Cloudflare te demande de choisir un **sous-domaine** (par exemple `yass-physio`), choisis-en un et valide. Il fera partie de l'adresse du serveur.

## Étape 3 : relever ton « Account ID »

1. Toujours dans **Workers & Pages**, regarde la colonne de droite : tu y vois **Account ID**, une longue suite de lettres et de chiffres.
2. Clique sur l'icône de copie à côté et colle-le quelque part (un bloc-notes) : c'est l'information n° 1.

## Étape 4 : créer un jeton d'accès pour GitHub

1. En haut à droite, clique sur l'icône de ton profil, puis **My Profile** (Mon profil) → **API Tokens**.
2. Clique **Create Token**.
3. À la ligne **Edit Cloudflare Workers**, clique **Use template**.
4. Dans **Permissions**, clique **+ Add more** et ajoute la ligne : **Account** → **D1** → **Edit**.
5. Dans **Account Resources**, choisis ton compte.
6. En bas, clique **Continue to summary**, puis **Create Token**.
7. Copie le jeton affiché (il ne sera plus montré) et colle-le dans ton bloc-notes : c'est l'information n° 2.

## Étape 5 : inventer ton code d'installation

Invente une phrase que personne ne devinera, par exemple `Le lac de Joux gèle en février 1987`, et note-la. C'est l'information n° 3.

Tu la taperas une seule fois, dans l'outil, pour activer la synchronisation. Elle empêche quiconque d'autre de créer un compte sur ton serveur.

## Étape 6 : enregistrer les 3 informations dans GitHub

1. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/settings/secrets/actions
2. Clique **New repository secret** et crée ces trois secrets, un par un :

| Name (nom, à recopier exactement) | Secret (valeur) |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | l'information n° 1 |
| `CLOUDFLARE_API_TOKEN` | l'information n° 2 |
| `RELAY_SETUP_CODE` | l'information n° 3 |

## Étape 7 : lancer l'installation du serveur

1. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/actions/workflows/relay.yml
2. Clique **Run workflow** (à droite), puis le bouton vert **Run workflow**.
3. Attends 1 à 2 minutes, jusqu'à la coche verte. Clique sur la ligne pour l'ouvrir.
4. En bas du résumé, tu vois **Adresse du relais**, du type `https://bilan-relay.yass-physio.workers.dev`. Copie-la : c'est l'information n° 4.

En cas de croix rouge, ouvre la ligne, copie le message d'erreur et envoie-le à Claude.

## Étape 8 : donner l'adresse du serveur au site

1. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/settings/variables/actions
2. Clique **New repository variable**.
3. **Name** : `RELAY_URL` ; **Value** : l'information n° 4. Clique **Add variable**.
4. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/actions/workflows/deploy.yml, clique **Run workflow**, puis **Run workflow**. Attends la coche verte (2 à 3 minutes).

## Étape 9 : activer la synchronisation dans l'outil

**Sur le premier appareil** (par exemple la tablette) :
1. Ouvre le bilan (`…/Logiciel-Physio-BPS/#/bilan`) et rafraîchis la page.
2. Dans **Mes bilans**, section **Synchronisation**, appuie sur **Activer la synchronisation**.
3. Tape ton code d'installation (information n° 3), donne un nom à l'appareil (« Tablette »), puis **Activer**.

**Sur chaque autre appareil** :
1. Sur un appareil déjà relié : **Mes bilans** → **Ajouter un appareil**. Un QR code et un code s'affichent pendant 10 minutes.
2. Sur le nouvel appareil :
   - **téléphone ou tablette** : scanne le QR code avec l'appareil photo, puis ouvre le lien ;
   - **ordinateur** : ouvre le bilan, puis **Mes bilans** → **Relier à mes autres appareils**, et tape le code.
3. Entre ton PIN (ou crée-le si c'est la première fois sur cet appareil), donne un nom à l'appareil, puis **Relier**.

Les bilans déjà présents sur chaque appareil sont gardés et réunis : rien n'est effacé.

---

## Bon à savoir

- **Hors connexion**, tout continue de marcher ; les modifications partent quand le réseau revient.
- **Appareil perdu** : sur un autre appareil, **Mes bilans** → **Mes appareils** → **Retirer**. Il ne reçoit plus rien ; ce qu'il contenait déjà reste protégé par son PIN.
- **PIN oublié sur un appareil** : réinitialise le site sur cet appareil (supprime les données du site dans les réglages du navigateur), puis relie-le à nouveau : tes bilans reviennent du serveur.
- **Questionnaires à domicile** : une fois la synchronisation active, le bloc « Questionnaires à domicile » du bilan crée un QR code pour le patient. Il remplit chez lui, sur son téléphone ; ses réponses arrivent toutes seules dans le bilan. Le lien est valable 14 jours et ne sert qu'une fois.
- **Coût** : l'offre gratuite de Cloudflare (100 000 requêtes par jour) suffit très largement.
