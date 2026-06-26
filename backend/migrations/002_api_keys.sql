CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  key_prefix    text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS api_key_usage (
  key_id  uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  period  char(7) NOT NULL,
  count   int NOT NULL DEFAULT 0,
  PRIMARY KEY (key_id, period)
);
