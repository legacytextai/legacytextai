-- Clean up and fix users_app table security properly

-- First, drop ALL existing policies to start fresh
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users_app' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.users_app';
    END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.users_app ENABLE ROW LEVEL SECURITY;

-- CREATE RESTRICTIVE POLICIES (highest security level)

-- 1. BLOCK all anonymous access (RESTRICTIVE = must pass this AND other policies)
CREATE POLICY "block_anonymous_access"
ON public.users_app
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. BLOCK authenticated users from seeing NULL auth_user_id records
CREATE POLICY "block_orphaned_records"
ON public.users_app
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (auth_user_id IS NOT NULL);

-- CREATE PERMISSIVE POLICIES (standard access rules)

-- 3. Authenticated users can SELECT their own data only
CREATE POLICY "select_own_profile"
ON public.users_app
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- 4. Authenticated users can INSERT their own profile only
CREATE POLICY "insert_own_profile"
ON public.users_app
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- 5. Authenticated users can UPDATE their own profile only
CREATE POLICY "update_own_profile"
ON public.users_app
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 6. Deny all DELETE operations for regular users
CREATE POLICY "deny_user_deletes"
ON public.users_app
FOR DELETE
TO authenticated
USING (false);

-- 7. Service role has unrestricted access (for edge functions)
CREATE POLICY "service_role_full_access"
ON public.users_app
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Performance optimization
CREATE INDEX IF NOT EXISTS idx_users_app_auth_user_id 
ON public.users_app(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Security documentation
COMMENT ON TABLE public.users_app IS 
'⚠️ CONTAINS SENSITIVE PII: email, phone_e164, name, children data. 
RLS enforced: Users can only access their own records. 
SMS-only users (NULL auth_user_id) are invisible to authenticated users and only accessible via service_role.';