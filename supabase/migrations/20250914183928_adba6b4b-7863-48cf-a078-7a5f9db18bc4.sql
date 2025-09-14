-- Secure phone change system with OTP verification
-- A) Anchor rows to auth.uid()
ALTER TABLE users_app
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Add unique constraint separately
ALTER TABLE users_app 
  DROP CONSTRAINT IF EXISTS users_app_auth_uid_unique;
ALTER TABLE users_app 
  ADD CONSTRAINT users_app_auth_uid_unique UNIQUE (auth_user_id);

-- Enforce RLS on users_app
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_app FORCE ROW LEVEL SECURITY;

-- Drop old phone-based policies
DROP POLICY IF EXISTS users_app_select_self_by_phone ON users_app;
DROP POLICY IF EXISTS users_app_update_self_by_phone ON users_app;

-- RLS: read/update only own row (by auth.uid())
CREATE POLICY users_app_select_self_uid
ON users_app FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY users_app_update_self_uid
ON users_app FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- B) Make phone 1:1 and client read-only
CREATE UNIQUE INDEX IF NOT EXISTS users_app_phone_unique
  ON users_app (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Guard trigger: block client updates to phone/status (service role bypasses)
CREATE OR REPLACE FUNCTION guard_users_app_sensitive()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE 
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  -- No JWT => likely service role (edge function). Allow.
  IF claims IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164 THEN
    RAISE EXCEPTION 'Clients cannot change phone_e164';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Clients cannot change status';
  END IF;

  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_guard_users_app_sensitive ON users_app;
CREATE TRIGGER trg_guard_users_app_sensitive
BEFORE UPDATE ON users_app
FOR EACH ROW EXECUTE FUNCTION guard_users_app_sensitive();

-- C) OTP storage table
CREATE TABLE IF NOT EXISTS otp_codes (
  id bigserial PRIMARY KEY,
  user_auth_id uuid NOT NULL,
  new_phone_e164 text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_codes_user_idx ON otp_codes (user_auth_id);
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (new_phone_e164);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes (expires_at);

-- Only one active OTP per (user, phone) at a time
CREATE UNIQUE INDEX IF NOT EXISTS otp_codes_active_unique
  ON otp_codes (user_auth_id, new_phone_e164)
  WHERE expires_at > now();

-- D) Convenience function to link current auth user to existing row by phone (first login only)
CREATE OR REPLACE FUNCTION link_self_to_phone(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users_app
     SET auth_user_id = auth.uid()
   WHERE phone_e164 = p_phone
     AND auth_user_id IS NULL;
END$$;

GRANT EXECUTE ON FUNCTION link_self_to_phone(text) TO authenticated;