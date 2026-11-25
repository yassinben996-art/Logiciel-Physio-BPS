# Accueil patient sur tablette, onglets repliables et nouvelles couleurs — document de conception

Date : 25.11.2026 · Auteur : Claude, avec Yassine Bensaid (Yass)
Statut : brouillon relu par un constructeur, à valider par Yass
Complète : `2026-11-24-bilan-standardise-design.md` (« la conception principale »). Ce qui n'est pas dit ici reste régi par elle.

## 1. Intention

Yass a utilisé le socle du bilan (plan 1, fusionné le 24.11.2026). C'est « une bonne base », mais il manque l'**accueil de 5 minutes** prévu dans la conception principale (§5.2), et l'écran est trop long : toutes les sections sont ouvertes d'emblée. Il veut aussi un aspect plus chaleureux.

Trois demandes de Yass, avec ses mots :
1. « Une étape de 5 min que le patient peut compléter avant la séance s'il arrive à l'heure, mais que l'on peut passer au cas où il arrive trop tard, et qu'il retrouvera dans le QR code. »
2. Les sections (anamnèse, mobilité, force, modification des symptômes…) dans des **onglets fermés au départ** ; « quand j'en ouvre un, si je ne le ferme pas, il reste ouvert ».
3. Couleurs : **blanc et brun/beige, avec du bleu**.

Le contenu clinique sera largement revu plus tard (revue de la littérature) : ce travail ne touche pas au contenu des sections d'examen.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Un accueil patient de 5 minutes environ, rempli **sur la tablette de Yass** avant la séance, qui alimente une section « Accueil » en tête du bilan.
- Un bouton pour **passer** l'accueil (patient en retard) ; l'accueil est alors marqué « à envoyer par QR code ».
- Des onglets repliables, fermés au départ, qui restent ouverts tant qu'on ne les ferme pas, avec l'avancement visible sur le titre.
- La palette blanc, beige/brun et bleu sur tout l'outil de bilan.

**Non-objectifs (pour ce plan)**
- L'envoi réel par QR code et le remplissage sur le téléphone du patient : ils arrivent avec le relais (plan suivant). Ici, « Passer » ne fait que marquer l'accueil « à envoyer ».
- Changer les couleurs de l'app PDDM : elle garde les siennes jusqu'à son intégration (étape 4).
- Revoir le contenu clinique des sections d'examen.

**Anti-objectifs** (échec même si « ça marche »)
- Le patient, tablette en main, peut voir « Mes bilans », le bilan d'un autre patient, ou les notes de Yass.
- L'accueil prend nettement plus de 5 minutes, ou ressemble à un formulaire administratif.
- Une réponse du patient coche quelque chose à la place de Yass (le principe du plan 1 reste : l'outil suggère, Yass décide).
- Les couleurs rendent le texte moins lisible (contraste insuffisant) que l'écran actuel.

## 3. Contraintes

Toutes celles de la conception principale et du plan 1 restent valables, en particulier : contenu dans des fichiers de données séparés et modulables, chaque élément sourcé ou marqué provisoire, aucun chiffre clinique inventé, rien de coché automatiquement, stockage uniquement chiffré, identité jamais dans SYSmeta.

S'ajoutent :
- **Langue du patient** : vouvoiement et langage courant, comme dans le parcours patient du PDDM (`src/data/patient.ts`). L'écran du clinicien reste au tutoiement.
- **Pas de réseau** dans ce plan (comme au plan 1).
- Les textes destinés au patient sont des **choix de conception provisoires**, à valider par Yass, sauf ceux d'un instrument publié (PSFS), dont la formulation doit venir d'une source citée ou être marquée provisoire.

## 4. Approches considérées

| Approche | Résumé | Verdict |
|---|---|---|
| **A. Accueil sur tablette + nouvel aspect, avant le relais** | Onglets et couleurs d'abord, puis l'accueil en mode patient verrouillé ; « Passer » marque l'accueil « à envoyer par QR code » ; l'envoi réel vient avec le relais | **Retenue par Yass** (25.11.2026) : utilisable en séance tout de suite ; les écrans de l'accueil serviront tels quels au QR code |
| B. Relais d'abord, puis accueil complet (tablette + QR) | Plus cohérent techniquement | Écartée : Yass attend plus longtemps l'accueil et le nouvel aspect |
| C. Deux petits plans (aspect seul, puis accueil) | Couleurs visibles un peu plus tôt | Écartée : plus de va-et-vient pour le même résultat que A |

**Conséquence sur la conception principale** : l'ordre des étapes (§5bis) devient 1. socle épaule (fait) ; **1b. accueil sur tablette, onglets, couleurs (ce document)** ; 2. relais, synchronisation, IA, et envoi de l'accueil et des questionnaires par QR code ; 3. questionnaires sous licence servis par le relais, retour des scores ; 4. PDDM, lombaire, cervical, couche douleur chronique.

## 5. Ce qui a été décidé

### 5.1 Onglets repliables (décision de Yass)
- Chaque section du bilan est un onglet repliable. **Tous sont fermés à l'ouverture d'un bilan.**
- Plusieurs onglets peuvent être ouverts en même temps ; un onglet ouvert **reste ouvert** jusqu'à ce que Yass le referme.
- Le titre de chaque onglet affiche l'**avancement** : nombre de champs remplis sur le nombre de champs (ex. « Mobilité · 4/9 »). *Proposition de Claude, non refusée par Yass.*
- Une suggestion « Ajouter » (test, drapeau) **ouvre l'onglet concerné** avant d'y amener le focus ; sinon le bouton n'aurait aucun effet visible.
- Une invite de mot-clé reste visible là où sont les notes, donc dans un onglet ouvert : c'est le cas puisque Yass vient d'y écrire.

### 5.2 Couleurs (demande de Yass)
- Palette de l'outil de bilan : fond **beige clair**, surfaces **blanches**, texte et titres **brun foncé**, **bleu** pour les actions principales, les liens, le focus et les éléments actifs. Le rouge reste réservé aux drapeaux rouges et aux erreurs.
- Elle s'applique à tout l'outil de bilan (écran PIN, « Mes bilans », bilan, accueil patient), pas à l'app PDDM.
- Contraste conforme WCAG AA (texte normal ≥ 4,5:1), en clair et en sombre.
- **Validation** : avant la fin du plan, Claude envoie à Yass des captures (tablette et téléphone) ; Yass valide ou demande des ajustements de teinte.

### 5.3 Accueil patient

**Déroulé (décision de Yass, détails proposés par Claude)**
1. Yass crée le bilan (ou l'ouvre) et, s'il le souhaite, saisit l'identité.
2. Il appuie sur **« Accueil patient »** : l'écran passe en **mode patient** (voir 5.4) et il tend la tablette.
3. Le patient répond, **une question par écran**, au vouvoiement, avec de grandes zones à toucher (comme le parcours patient du PDDM). Il peut revenir en arrière. Chaque question peut être laissée sans réponse.
4. Écran final : « Merci, vous pouvez rendre la tablette. »
5. Pour quitter le mode patient, Yass saisit son PIN. Le bilan se rouvre avec la section **Accueil** remplie.

**« Passer l'accueil »** : un bouton dans le bilan marque l'accueil « à envoyer par QR code ». L'envoi réel arrive avec le relais. Un accueil commencé puis interrompu garde ses réponses et peut être repris.

**Statut de l'accueil**, affiché en tête de la section Accueil : « non fait », « rempli sur la tablette » (avec la date), ou « à envoyer par QR code ».

**Contenu** (conception principale §5.2, ordre proposé par Claude). Tout est dans un fichier de contenu, modifiable sans toucher au code, et marqué provisoire :
- **Zone(s) douloureuse(s)** : épaule, nuque, bas du dos ; **plusieurs choix possibles**. La réponse est **enregistrée**, elle ne change pas la zone du bilan. La zone principale reste choisie par Yass (pour l'instant, l'épaule, seule zone dont le contenu existe) ; les autres zones cochées sont affichées comme zones secondaires (conception principale §5bis). Si le patient n'a pas coché la zone du bilan, la section Accueil le signale à Yass. *Décision de Claude.*
- **Côté**, posé seulement si l'épaule est cochée : droite, gauche, les deux. Il est **enregistré et exporté** ; il ne modifie pas les écrans de mobilité et de force dans ce plan. *Ajout et décision de Claude.*
- **Depuis quand** : moins de 6 semaines, 6 semaines à 3 mois, plus de 3 mois (mêmes catégories que le PDDM).
- **Début** : petit à petit sans cause précise, après un choc ou une chute, après une opération (mêmes catégories que le PDDM).
- **Douleur moyenne** de 0 à 10.
- **Body chart** : le patient touche les zones douloureuses sur une silhouette de face et de dos. Plusieurs zones possibles.
- **PSFS** : jusqu'à 3 activités que la douleur rend difficiles, chacune notée de 0 (impossible) à 10 (comme avant le problème). Instrument publié : formulation à reprendre d'une source citée (version française), sinon marquée provisoire. Seules les **notes de chaque activité** sont affichées et exportées : **aucune moyenne ni score combiné** (aucun chiffre sans source). *Décision de Claude.*
- **Dépistage**, 5 questions, construites maintenant et **marquées provisoires** en attendant la validation de Yass (*décision de Claude*) :
  - trois échelles de 0 à 10 reprises telles quelles du parcours PDDM (`src/data/items.ts`, « repères maison, non validés ») : attentes de guérison (`exp`), peur que bouger aggrave (`fear`), inquiétude (`worry`) ;
  - deux questions oui/non reformulées pour l'accueil, inspirées des éléments du PDDM : « La douleur perturbe-t-elle votre sommeil ? » et « Êtes-vous en arrêt de travail à cause de cette douleur ? ».
  - Aucune note globale de dépistage n'est calculée.

**Ce que deviennent les réponses**
- Elles remplissent la section **Accueil** du bilan, que Yass peut **corriger** (même principe que le préremplissage du PDDM, conception principale §5bis). **La réponse d'origine du patient est conservée** : quand Yass corrige, l'écran et le PDF montrent la valeur retenue et la mention « patient : <réponse d'origine> ». Cela garde la trace pour le rebilan et évite de devoir migrer les bilans stockés plus tard. *Décision de Claude.*
- Elles alimentent le moteur de règles comme n'importe quel champ : les règles du fichier de contenu peuvent s'appuyer sur la durée, le body chart, le dépistage, etc. (ex. du §5.6 : « douleur de plus de 3 mois → CSI-25 »). Les seuils exacts viendront de la revue de la littérature ; ce plan n'ajoute que des règles d'exemple, provisoires.
- **« Yellow flags préremplis depuis l'accueil »** (conception principale §5.3) s'entend comme des **suggestions** de cocher, jamais des cases cochées d'office : *interprétation de Claude, conforme à l'anti-objectif « l'outil décide à la place du clinicien »*.
- Exports : l'accueil apparaît dans le PDF et dans le bloc SYSmeta « Anamnèse » (PSFS et scores compris). Le body chart y figure sous forme de liste de zones (ex. « Zones douloureuses : épaule droite (face), bras droit (dos) »).

### 5.4 Mode patient (proposition de Claude, non refusée par Yass)
- Pendant l'accueil, la tablette n'affiche **que** l'accueil de ce bilan : ni en-tête du bilan, ni « Mes bilans », ni suggestions, ni identité saisie par Yass.
- Seuls les boutons du parcours (Suivant, Précédent, Terminer) sont disponibles. **Sortir exige le PIN**, y compris pour abandonner en cours de route.
- L'app se défend seule, **dans ses propres limites** (*décision de Claude*) :
  - le mode patient est enregistré avec le bilan : un rechargement, un changement d'adresse (`#/…`) ou un retour arrière ramène à l'écran de déverrouillage, jamais au bilan ni à l'app PDDM ;
  - le bouton « Précédent » du navigateur ne fait pas sortir du parcours ;
  - l'app demande le plein écran au début de l'accueil quand le navigateur le permet ;
  - un autre onglet du navigateur déjà déverrouillé passe aussi au verrouillage quand le mode patient commence.
- Ce que l'app ne peut pas empêcher (barre d'adresse, changement d'application, autres apps de la tablette) relève du système : l'app recommande à Yass, la première fois, d'activer l'**Accès guidé** (iPad) ou l'**épinglage d'écran** (Android).
- Les réponses sont enregistrées chiffrées au fil de l'eau, comme toute saisie (plan 1).
- Le verrouillage automatique après 15 minutes d'inactivité reste actif.

## 6. Ce qui est laissé au constructeur

- Le dessin du body chart (nombre et découpage des zones, silhouette), dans le respect de 5.3 : face et dos, touchable au doigt sur tablette et téléphone.
- Les valeurs exactes des couleurs, dans le respect de 5.2 ; validées par Yass sur captures.
- Le schéma de données de l'accueil dans `BilanState` et la façon dont les règles y font référence, en gardant la modularité (contenu de l'accueil dans `src/bilan/content/`).
- La mise en page de la section Accueil côté clinicien et dans le PDF.
- Le découpage en tâches et l'ordre de construction, en commençant par les onglets et les couleurs.
