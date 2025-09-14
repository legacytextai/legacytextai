-- Add required columns to users_app if not exists (idempotent)
ALTER TABLE users_app 
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Add unique constraint on auth_user_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_app_auth_user_id_key'
  ) THEN
    ALTER TABLE users_app ADD CONSTRAINT users_app_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_app FORCE ROW LEVEL SECURITY;

-- Create RLS policies (idempotent)
DO $$ 
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users_app' AND policyname = 'users_app_select_self_uid'
  ) THEN
    CREATE POLICY users_app_select_self_uid
    ON users_app FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());
  END IF;

  -- UPDATE policy  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users_app' AND policyname = 'users_app_update_self_uid'
  ) THEN
    CREATE POLICY users_app_update_self_uid
    ON users_app FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users_app' AND policyname = 'users_app_insert_self_uid'
  ) THEN
    CREATE POLICY users_app_insert_self_uid
    ON users_app FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());
  END IF;
END $$;

-- Create unique index on email if not exists
CREATE UNIQUE INDEX IF NOT EXISTS users_app_email_unique
  ON users_app (email) WHERE email IS NOT NULL;

-- Create RPC function to ensure user row exists
CREATE OR REPLACE FUNCTION ensure_user_self(p_email text DEFAULT NULL)
RETURNS users_app
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  r users_app;
BEGIN
  SELECT * INTO r FROM users_app WHERE auth_user_id = auth.uid();
  
  IF NOT FOUND THEN
    INSERT INTO users_app (auth_user_id, email, status, phone_e164)
    VALUES (auth.uid(), p_email, 'pending', '')
    RETURNING * INTO r;
  ELSE
    IF p_email IS NOT NULL AND (r.email IS NULL OR r.email <> p_email) THEN
      UPDATE users_app SET email = p_email WHERE id = r.id RETURNING * INTO r;
    END IF;
  END IF;
  
  RETURN r;
END$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_user_self(text) TO authenticated;