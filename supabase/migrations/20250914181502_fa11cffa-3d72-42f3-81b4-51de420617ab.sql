-- Enable Row Level Security on users_app
ALTER TABLE users_app ENABLE ROW LEVEL SECURITY;

-- Allow an authenticated user to READ ONLY their own row (matched by phone in JWT)
CREATE POLICY IF NOT EXISTS users_app_select_self_by_phone
ON users_app
FOR SELECT
TO authenticated
USING ( phone_e164 = COALESCE(auth.jwt() ->> 'phone', '') );

-- Allow an authenticated user to UPDATE ONLY their own row (matched by phone in JWT)
CREATE POLICY IF NOT EXISTS users_app_update_self_by_phone
ON users_app
FOR UPDATE
TO authenticated
USING ( phone_e164 = COALESCE(auth.jwt() ->> 'phone', '') )
WITH CHECK ( phone_e164 = COALESCE(auth.jwt() ->> 'phone', '') );