-- Relais du bilan : uniquement des données chiffrées par les appareils, des identifiants aléatoires
-- et des empreintes de jetons.
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE tickets (
  hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE records (
  id TEXT PRIMARY KEY,
  meta TEXT NOT NULL,
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX records_seq ON records (seq);
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT INTO meta (key, value) VALUES ('seq', 0), ('account', 0);
