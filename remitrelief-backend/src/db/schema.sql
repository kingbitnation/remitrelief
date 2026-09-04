-- RemitRelief Postgres schema (Phase 2.2)

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  category TEXT,
  goal NUMERIC NOT NULL,
  raised NUMERIC NOT NULL DEFAULT 0,
  milestones_total INT NOT NULL DEFAULT 0,
  milestones_verified INT NOT NULL DEFAULT 0,
  escrow_address TEXT,
  usdc_issuer TEXT,
  recipient_name TEXT,
  image_gradient TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  milestone_labels JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  donor TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT,
  message TEXT,
  verified_on_chain BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS donations_tx_hash_uidx
  ON donations (tx_hash) WHERE tx_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS ledger_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  campaign_id TEXT,
  amount NUMERIC,
  milestone_index INT,
  actor TEXT,
  tx_hash TEXT,
  note TEXT,
  proof_note TEXT,
  verified_on_chain BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ledger_tx_type_campaign_uidx
  ON ledger_events (tx_hash, type, campaign_id)
  WHERE tx_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS users (
  public_key TEXT PRIMARY KEY,
  roles JSONB NOT NULL DEFAULT '["donor"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_nonces (
  public_key TEXT NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (public_key, nonce)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '["DONOR"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS indexed_cursors (
  cursor_key TEXT PRIMARY KEY,
  cursor_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
