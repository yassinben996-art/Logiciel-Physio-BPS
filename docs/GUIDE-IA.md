# Activer les suggestions de l'IA

À faire **une seule fois**, sur ton ordinateur, en 10 minutes environ. Il faut que la synchronisation soit déjà installée (voir `GUIDE-SYNCHRONISATION.md`).

L'IA lit un résumé **anonymisé** du bilan : sans nom, prénom, date de naissance ni code. Dans les notes, seuls le nom et le prénom du patient, son téléphone et son e-mail sont remplacés ; tout le reste (noms de tests, dates, lieux, médecins) est envoyé tel quel. Tu vois toujours le texte exact avant l'envoi, et tu peux le corriger.

---

## Étape 1 : créer un compte Groq (gratuit)

1. Va sur https://console.groq.com
2. Crée ton compte. Si l'inscription par e-mail affiche une erreur, essaie **Continue with Google**, ou une fenêtre de navigation privée.
3. Aucune carte bancaire n'est demandée pour l'offre gratuite.

## Étape 2 : créer la clé

1. Dans le menu, clique **API Keys**.
2. Clique **Create API Key** et donne-lui un nom (par exemple `bilan`).
3. Copie la clé (elle commence par `gsk_`) dans ton bloc-notes. Elle ne sera plus affichée. **Ne l'envoie à personne, pas même à Claude.**

## Étape 3 (facultative) : « Zero Data Retention »

Dans les réglages de ton compte Groq (**Settings → Data Controls**, ou un menu proche), si une option **Zero Data Retention** est proposée, active-la : Groq ne gardera pas tes demandes. Ce n'est pas obligatoire, l'identité n'étant jamais envoyée.

## Étape 4 : enregistrer la clé dans GitHub

1. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/settings/secrets/actions
2. Clique **New repository secret**.
3. **Name** : `GROQ_API_KEY` · **Secret** : la clé copiée à l'étape 2. Clique **Add secret**.

## Étape 5 : mettre à jour le serveur

1. Ouvre https://github.com/yassinben996-art/Logiciel-Physio-BPS/actions/workflows/relay.yml
2. Clique **Run workflow**, puis **Run workflow**. Attends la coche verte (1 à 2 minutes).

## Étape 6 : essayer

Dans un bilan, dans le panneau **Suggestions**, appuie sur **Demander à l'IA**. Vérifie le texte, puis **Envoyer**.

---

## Facultatif : une deuxième IA de secours (OpenRouter)

Si Groq est épuisé (environ 1 000 demandes par jour) ou en panne, l'outil essaie d'abord un deuxième modèle Groq, puis OpenRouter, si tu l'as installé :
1. Crée un compte sur https://openrouter.ai, puis une clé dans **Keys**.
2. Dans les réglages de confidentialité d'OpenRouter, tu peux refuser les fournisseurs qui entraînent leurs modèles sur les données.
3. Ajoute le secret GitHub `OPENROUTER_API_KEY`, puis relance le workflow « Relais » (étape 5).

## Bon à savoir

- **30 demandes par heure** au plus : c'est une protection de ton quota gratuit.
- Si aucune IA ne répond, l'outil affiche « IA indisponible pour le moment, seules les règles sont actives » ; tout le reste continue de marcher.
- **« Copier pour Claude »**, dans la zone d'export, ne passe par aucun serveur : il copie le résumé anonymisé avec une consigne, que tu colles toi-même dans Claude.
