# Rebilan, évolution et rappels — document de conception

Date : 27.11.2026 · Auteur : Claude, avec Yassine Bensaid (Yass)
Statut : brouillon, à valider par Yass
Complète : `2026-11-24-bilan-standardise-design.md` et les conceptions suivantes. Ce qui n'est pas dit ici reste régi par elles.

## 1. Intention

Au premier bilan, Yass repère des déficits **physiques** (force, mobilité) et **psychologiques** (confiance en soi, drapeaux jaunes). Il travaille dessus et refait un bilan environ **tous les mois**, plus tôt pour certains patients. La comparaison sert à **évaluer l'évolution physique et psychologique**. Il veut aussi qu'un onglet **mette en avant les patients à rebilanter** quand le délai est passé (demandes du 27.11.2026).

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un bouton **« Rebilan »** sur tout bilan, **à tout moment**, même avant l'échéance (décision de Yass).
- Pendant le rebilan, les valeurs du bilan précédent sont **cachées par défaut**, avec un bouton pour les afficher (« avant : … » sous chaque champ) (décision de Yass, option C).
- Une vue **« Évolution »** qui met côte à côte les bilans du patient, avec les écarts chiffrés, et qui passe dans le PDF.
- Un onglet **« À rebilanter »** dans « Mes bilans ».

**Non-objectifs**
- Interpréter l'évolution (« amélioration significative ») : seulement les valeurs et les écarts. Les seuils de changement cliniquement important ne sont pas sourcés.
- Rappels par notification ou e-mail : l'onglet suffit.

**Anti-objectifs**
- Un rebilan modifie le bilan précédent, ou lui prend des valeurs sans que Yass les ait saisies (pas de pré-remplissage des mesures).
- Un patient disparaît de « À rebilanter » sans action de Yass, ou un patient en fin de prise en charge y reste.

## 3. Contraintes

Celles des conceptions précédentes (chiffrement, synchronisation, aucune donnée lisible hors des appareils). Un rebilan est un bilan comme les autres : enregistré, synchronisé, exporté.

## 4. Approches considérées

| Approche | Verdict |
|---|---|
| **A. Bilans reliés en série** (le rebilan connaît le patient et le bilan précédent) | **Retenue** : comparaison et rappels fiables, sans dépendre de l'orthographe du nom |
| B. Rapprochement par nom et date de naissance | Écartée : une faute de frappe sépare un patient en deux ; deux homonymes fusionnent |
| C. Un seul bilan qui accumule les mesures | Écartée : casse les exports par séance et l'historique |

## 5. Ce qui a été décidé

### 5.1 Série et rebilan (choix de Claude)
- Chaque bilan porte un **identifiant de patient** (celui du premier bilan) et, pour un rebilan, l'identifiant du **bilan précédent**.
- « Rebilan » crée un bilan **vide** pour la même zone, avec l'identité reprise, puis l'ouvre. Il est titré « Rebilan n° N » dans l'en-tête.
- L'en-tête du rebilan propose **« Afficher le bilan précédent »** : chaque champ montre alors « avant : … » (même texte que les exports), sans rien copier.

### 5.2 Évolution (choix de Claude)
- Bloc « Évolution », présent dès qu'un bilan a un prédécesseur. Une colonne par bilan de la série (au plus les 5 derniers, plus le premier s'il n'y est pas), avec la date.
- Lignes, quand au moins un bilan les a renseignées :
  - douleur actuelle et pire douleur de l'accueil ;
  - échelles de l'accueil (peur que bouger aggrave, confiance de guérir) ;
  - PSFS ;
  - champs chiffrés, par côté ;
  - tests (positif / négatif) ;
  - scores des questionnaires à domicile.
- Écart entre le premier et le dernier bilan pour les valeurs chiffrées (« +30° », « −3 »), sans jugement de valeur ni couleur « bien / mal ».
- PDF du rebilan : section « Évolution » avec les mêmes lignes.

### 5.3 Rappels (choix de Claude, dans le cadre de la demande de Yass)
- Chaque bilan porte un **délai de suivi**, 4 semaines par défaut, réglable dans l'en-tête (1, 2, 3, 4, 6, 8 semaines). Il porte aussi une case **« Fin de prise en charge »**. Un rebilan reprend le délai du bilan précédent.
- Onglet **« À rebilanter (n) »** dans « Mes bilans ». Pour chaque patient, on prend son dernier bilan : il apparaît si ce bilan date de plus que son délai et que la prise en charge n'est pas terminée. Le plus en retard est en haut, avec « dernier bilan le JJ.MM, en retard de N jours » et les boutons « Rebilan » et « Ouvrir ».
- Les copies en conflit sont exclues de l'onglet.

## 6. Ce qui est laissé au constructeur

Format exact des champs dans l'état et la fiche, mise en page du bloc Évolution et de l'onglet, découpage en tâches et tests.
