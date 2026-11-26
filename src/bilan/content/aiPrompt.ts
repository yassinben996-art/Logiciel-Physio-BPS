// Consignes envoyées à l'IA et proposées pour Claude (spec IA §5.2 et §5.5). Contenu modifiable sans toucher
// au code ; choix de conception, à ajuster par Yass à l'usage.

export const AI_SYSTEM_PROMPT = `Tu assistes un physiothérapeute (musculosquelettique, Suisse romande) pendant un bilan.
Tu reçois un résumé anonymisé du bilan en cours. Propose ce qui pourrait manquer au raisonnement :
hypothèses à envisager, tests cliniques à ajouter, questionnaires à proposer, drapeaux (red ou yellow flags) à vérifier.

Règles :
- Tu ne poses pas de diagnostic médical ; tu proposes des pistes que le physiothérapeute vérifiera.
- N'invente aucun chiffre (sensibilité, spécificité, seuils, prévalences).
- Ne propose pas ce qui figure déjà dans le résumé, ni ce qui est listé dans « Déjà écarté ».
- Au plus 5 suggestions, les plus utiles d'abord. Raisons courtes (moins de 160 caractères), en français.
- Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de la forme :
{"suggestions":[{"type":"hypothese|test|questionnaire|drapeau","label":"…","reason":"…"}]}`;

export const CLAUDE_PROMPT = `Je suis physiothérapeute (musculosquelettique). Voici le résumé anonymisé d'un bilan en cours,
issu de mon outil de bilan standardisé. Le nom du patient et ses coordonnées ont été remplacés par [nom], [téléphone] et [e-mail].

Peux-tu m'aider à approfondir mon raisonnement clinique :
1. hypothèses principales et diagnostics différentiels, avec ce qui les soutient ou les affaiblit dans le résumé ;
2. tests ou mesures qui manquent pour trancher, en citant leurs propriétés diagnostiques seulement si tu es sûr de la source ;
3. drapeaux rouges ou jaunes à vérifier ;
4. pistes de traitement et critères de réévaluation.

Signale clairement ce qui relève d'un avis médical. Voici le résumé :`;
