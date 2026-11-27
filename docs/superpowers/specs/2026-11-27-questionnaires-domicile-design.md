# Questionnaires à domicile par QR code — document de conception

Date : 27.11.2026 · Auteur : Claude, avec Yassine Bensaid (Yass)
Statut : validé par Yass le 27.11.2026 (« je trouve ça parfait »)
Complète : `2026-11-24-bilan-standardise-design.md` (« la conception principale »), `2026-11-25-synchronisation-design.md` (le relais) et `2026-11-26-ia-design.md`. Ce qui n'est pas dit ici reste régi par elles.

## 1. Intention

Le questionnaire d'accueil, rempli sur la tablette au début de la séance, suffit pour démarrer. Les questionnaires plus longs (SPADI, QuickDASH, TSK…) prendraient trop de temps en séance. Yass veut que le patient les remplisse **après la séance, chez lui, sur son téléphone**, et que **les réponses s'intègrent ensuite toutes seules dans son bilan**, avec les scores calculés.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- À la fin de la séance, un bouton **« Questionnaires à domicile »** dans le bilan. L'outil **propose** des questionnaires d'après le bilan (pré-cochés) ; Yass **peut en cocher d'autres** (décision de Yass).
- Un **QR code** à scanner, et un **lien à copier** (pour un SMS ou WhatsApp).
- Chez le patient : une page pour téléphone, sans compte ni application ; un questionnaire après l'autre ; ce qui est rempli reste sur son téléphone jusqu'à l'envoi.
- Les réponses arrivent dans le bilan à la synchronisation suivante, avec les scores (et sous-scores), et figurent dans le PDF, l'export SYSmeta et le résumé envoyé à l'IA.
- « Mes bilans » signale « réponses reçues » ou « questionnaires en attente ».

**Non-objectifs**
- Questionnaires du genou (KOOS, IKDC) : conditions d'utilisation à vérifier d'abord, plus tard.
- Rappels au patient : impossible sans ses coordonnées.
- Le patient ne voit pas ses scores (décision de Claude, validée par Yass : éviter une mauvaise interprétation).

**Anti-objectifs** (échec même si « ça marche »)
- Le relais (ou quiconque sans le lien) peut lire les réponses du patient.
- La page du patient affiche le nom du patient ou celui de Yass.
- Un lien sert deux fois, ou reste utilisable après 14 jours.
- Des réponses reçues se perdent (fermeture d'onglet, bilan ouvert ailleurs, deux appareils en même temps).
- Un tiers qui connaît l'adresse du relais peut remplir la base ou vider le quota.

## 3. Contraintes

- Celles des conceptions précédentes : chiffrement AES-GCM 256, clé jamais transmise au relais, aucun `localStorage` ni `sessionStorage`, gratuité, Yass guidé pas à pas pour toute action de sa part.
- La synchronisation doit être active sur l'appareil qui crée le QR (le relais sert de boîte aux lettres). Sans elle, le bouton explique comment l'activer.
- La page du patient est servie par le même site (GitHub Pages) : même origine que celle déjà autorisée par le relais.
- Les 8 questionnaires publics existants (`src/questionnaires/public.ts`) : NDI, QuickDASH, SPADI, CSI, TSK, PCS, FABQ, PSEQ, avec leurs règles de calcul existantes.

## 4. Approches considérées

| Approche | Résumé | Verdict |
|---|---|---|
| **A. Boîte aux lettres chiffrée sur le relais** | Le QR contient un ticket et une clé ; le téléphone du patient chiffre ses réponses et les dépose ; les appareils de Yass les relèvent et les déchiffrent | **Retenue** : seule façon d'intégrer automatiquement sans que le relais lise les réponses |
| B. Remplissage sur la tablette du cabinet | Comme l'accueil | Écartée : Yass veut que le patient remplisse chez lui |
| C. Retour par e-mail ou PDF | Le patient renvoie un fichier | Écartée : recopie manuelle, données en clair |

## 5. Ce qui a été décidé

### 5.1 Côté Yass (décision de Yass, détails de Claude)
- Bouton « Questionnaires à domicile » dans un bloc du bilan, sous les sections, avant l'export.
- Liste des 8 questionnaires avec case à cocher. **Pré-cochés** : ceux que les suggestions proposent en ce moment, ceux déjà ajoutés depuis une suggestion (règles ou IA), et ceux par défaut de la zone (fichier de contenu : épaule → SPADI et QuickDASH ; genou → aucun). Un questionnaire dont les réponses sont déjà reçues n'est pas pré-coché.
- « Créer le QR code » : QR, lien, bouton « Copier le lien », date limite (« valable jusqu'au JJ.MM.AAAA »).
- Une seule demande en attente par bilan ; « Nouvel envoi » la remplace (l'ancien lien n'est plus attendu). Les réponses déjà reçues sont gardées ; un nouvel envoi les complète, questionnaire par questionnaire (le plus récent l'emporte).
- Bloc « Réponses du patient » : pour chaque questionnaire reçu, nom, score affiché, sous-scores, mention « incomplet / non valable » s'il y a lieu, date de réception.

### 5.2 Lien et chiffrement (choix de Claude)
- Le relais crée un **ticket** aléatoire (16 octets) valable **14 jours**, utilisable **une fois** ; il n'en garde que l'empreinte (SHA-256).
- L'appareil de Yass tire une **clé** aléatoire (32 octets, AES-GCM). Lien : `<site>#/q?t=<ticket>&k=<clé>&q=<ids séparés par des virgules>`. La clé n'est que dans le lien (partie après `#`, jamais envoyée à un serveur) et dans le bilan (chiffré, synchronisé), pour que **n'importe quel appareil de Yass** puisse relever les réponses.

### 5.3 Côté patient (choix de Claude)
- Page `#/q`, aux couleurs du bilan. Accueil : « Questionnaires de votre physiothérapeute », nombre de questionnaires, durée estimée, « Commencer ». Puis chaque questionnaire, page par page (même affichage des questions que l'app existante), avec la progression.
- Brouillon gardé sur le téléphone (IndexedDB) jusqu'à l'envoi ; il peut fermer et reprendre avec le même lien.
- Réponses manquantes : signalées avant l'envoi, sans bloquer.
- « Envoyer à mon physiothérapeute » : les réponses sont chiffrées avec la clé et déposées sur le relais. Écran « Merci, c'est envoyé. Vous pouvez fermer cette page. » Le brouillon est effacé et un repère « déjà envoyé » est gardé.
- Lien expiré ou déjà utilisé : « Ce lien n'est plus valable. Demandez-en un nouveau à votre physiothérapeute. » Hors connexion à l'envoi : message, brouillon gardé, « Réessayer ».

### 5.4 Relais (choix de Claude)
- Table `home_q` : empreinte du ticket, date limite, boîte chiffrée (vide tant que rien n'est déposé), appareil qui la relève et depuis quand.
- Routes : création du ticket (protégée), **dépôt** (publique, mais seulement avec un ticket valide, non utilisé, non expiré ; 64 Ko au plus), liste des dépôts à relever, **relève** atomique par un seul appareil (bail de 10 minutes : si l'appareil ne confirme pas, un autre pourra relever), suppression après intégration. Les tickets expirés sont effacés au passage.
- Rien n'est journalisé.

### 5.5 Intégration dans le bilan (choix de Claude)
- À chaque synchronisation, après la réception des bilans, l'appareil demande s'il y a des dépôts. Pour chacun, il retrouve le bilan qui attend ce ticket, relève la boîte, la déchiffre et ajoute les réponses au bilan, **puis seulement** demande au relais de supprimer le dépôt. En cas d'échec avant la suppression, le bail expire et le dépôt sera relevé de nouveau : rien ne se perd.
- Si ce bilan est **ouvert à l'écran**, les réponses sont ajoutées à la saisie ouverte (et au coffre), sans rien remplacer. Sinon, au bilan enregistré, qui repart vers les autres appareils comme toute modification.
- Les scores sont calculés à l'affichage avec les règles existantes ; seules les réponses brutes sont gardées.

## 6. Ce qui est laissé au constructeur

- Schéma exact de la table, des routes, du format chiffré et du brouillon.
- Durée estimée affichée au patient (d'après le nombre de questions).
- Mise en page du bloc côté Yass et de la page du patient.
- Formulation exacte des lignes dans le PDF, SYSmeta et le résumé de l'IA.
- Découpage en tâches et tests.
