# Profil des moteurs de douleur

Application web statique, en français, pour physiothérapeutes : **aide au raisonnement clinique, non validée**.
Pour une région (nuque, lombaires, épaule), l'outil recueille le contexte, dépiste les drapeaux rouges,
évalue les six volets du modèle _Pain and Disability Drivers Management_ (PDDM / MGVDI) et affiche un plan
interactif : cibles de traitement chiffrées, interventions avec niveau de preuve et références, critères d'orientation.

> Ce n'est **ni un dispositif médical ni un outil de diagnostic**. Il ne remplace ni l'examen clinique ni l'avis médical.
> **Aucune donnée n'est enregistrée** : pas de backend, pas de `localStorage`, pas d'analytics, aucune requête réseau
> après le chargement de la page.

## Lancer en local

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Commande          | Rôle                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `npm run dev`     | Serveur de développement                                                    |
| `npm run build`   | Vérification TypeScript + build statique dans `dist/`                       |
| `npm run preview` | Sert `dist/` localement                                                     |
| `npm test`        | Tests Vitest (moteur, données, résumé, interface, parité avec le prototype) |
| `npm run lint`    | ESLint (zéro avertissement toléré)                                          |
| `npm run format`  | Prettier                                                                    |

## Déployer

Le site est 100 % statique (`dist/`), avec un `base` relatif : il fonctionne à la racine ou dans un sous-dossier.

- **Netlify** : « Add new site » → « Import an existing project » → choisir le dépôt. `netlify.toml` fournit la
  commande (`npm run build`), le dossier (`dist`) et des en-têtes de sécurité (CSP stricte, `no-referrer`).
  Ou, sans dépôt : `npm run build` puis glisser-déposer `dist/` sur app.netlify.com/drop.
- **Vercel** : « Add New… → Project » → importer le dépôt. `vercel.json` fournit la même configuration.
  En ligne de commande : `npx vercel` puis `npx vercel --prod`.
- **GitHub Pages** : `npm run build`, publier le contenu de `dist/` (par exemple sur une branche `gh-pages`).

La CI GitHub (`.github/workflows/ci.yml`) lance lint, tests et build à chaque push.

## Architecture

```
src/
  data/       données cliniques typées, sans logique (portées du prototype)
  engine/     logique pure : analyze, targets, interventions, summary (aucun React, aucun DOM)
  state/      état unique (useReducer) et fonctions pures sur le cas
  components/ interface React (radial SVG écrit à la main, arbre <details> natif…)
  pdf/        export jsPDF (chargé dynamiquement au clic) + sanitiseur Latin-1
tests/        Vitest + Testing Library
reference/    prototype.html : source de vérité fonctionnelle
```

`tests/parity.test.ts` exécute les fonctions `analyze()`, `targets()` et `interventions()` **du prototype**
sur 3000 cas aléatoires et vérifie que le moteur porté donne exactement les mêmes résultats.

## Honnêteté scientifique

- **Niveau de validation** : nuque = contenu validé par Delphi (Gérard 2025) ; lombaires = essais pilotes non
  randomisés (Longtin 2021, 2023) ; épaule = adaptation non validée (appuyée par De Baets 2025).
- **Les seuils qui allument un volet sont des choix de conception**, pas des seuils publiés. Seuls CSI-9 ≥ 20
  (CSI-25 ≥ 40) et les catégories painDETECT (< 13, 13–18, ≥ 19) viennent d'outils publiés.
- Les six curseurs 0–10 du volet cognitivo-affectif sont des **repères maison non validés**.
- Aucun item de questionnaire sous licence (STarT MSK, CSI, painDETECT, NDI, ODI, SPADI, QuickDASH, FABQ, TSK,
  PCS, PSEQ) n'est reproduit : le clinicien saisit des scores ou des catégories.
- Les références ont été lues sur titres et résumés : **à vérifier dans les textes complets avant usage clinique**.

Voir `DECISIONS.md` pour les choix d'implémentation et les écarts au prototype.
