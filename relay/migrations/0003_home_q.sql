-- Questionnaires à domicile : une boîte aux lettres par ticket. Le relais ne garde que l'empreinte du ticket
-- et la boîte chiffrée par le téléphone du patient (illisible sans la clé du lien).
CREATE TABLE home_q (
  hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  box TEXT,
  claimed_by TEXT,
  claimed_at TEXT
);
