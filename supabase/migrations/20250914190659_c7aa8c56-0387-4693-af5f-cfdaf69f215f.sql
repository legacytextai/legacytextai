-- Add email to users_app and index it
ALTER TABLE users_app
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS users_app_email_unique
  ON users_app (email)
  WHERE email IS NOT NULL;

-- Ensure RLS is enabled/forced (keep from prior work)
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_app FORCE ROW LEVEL SECURITY;

-- Allow a signed-in user to INSERT their own row (first login bootstrap)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users_app' 
    AND policyname = 'users_app_insert_self_uid'
  ) THEN
    CREATE POLICY users_app_insert_self_uid
    ON users_app
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());
  END IF;
END$$;

-- Helpful defaults
ALTER TABLE users_app
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Update last_login_at trigger
CREATE OR REPLACE FUNCTION touch_last_login()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.last_login_at := now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_touch_last_login ON users_app;
CREATE TRIGGER trg_touch_last_login
BEFORE UPDATE ON users_app
FOR EACH ROW
WHEN (NEW.auth_user_id = OLD.auth_user_id AND NEW.last_login_at IS DISTINCT FROM OLD.last_login_at)
EXECUTE FUNCTION touch_last_login();