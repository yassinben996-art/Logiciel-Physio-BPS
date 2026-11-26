-- Compteur horaire des appels à l'IA (limite du compte, pour protéger le quota gratuit).
CREATE TABLE ai_usage (
  hour TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
