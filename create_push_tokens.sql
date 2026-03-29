DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platformenum') THEN
    CREATE TYPE platformenum AS ENUM ('expo', 'web_push', 'pwa_ios', 'pwa_android');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  platform platformenum NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_push_tokens_token ON push_tokens(token);
