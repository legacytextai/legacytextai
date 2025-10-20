-- Fix security issue: Ensure users_app table is NOT publicly readable
-- Handle existing NULL auth_user_id records for SMS-only users

-- Step 1: For SMS-only users without auth_user_id, we need a different approach
-- Option A: Keep them separate in a different table (recommended)
-- Option B: Allow NULL but add explicit deny policies (we'll use this for backwards compatibility)

-- First, ensure RLS is enabled
ALTER TABLE public.users_app ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_app_select_self_uid" ON public.users_app;
DROP POLICY IF EXISTS "Service functions read access" ON public.users_app;
DROP POLICY IF EXISTS "users_app_insert_self_uid" ON public.users_app;
DROP POLICY IF EXISTS "users_app_update_self_uid" ON public.users_app;
DROP POLICY IF EXISTS "Service functions insert access" ON public.users_app;
DROP POLICY IF EXISTS "Service functions update access" ON public.users_app;

-- CREATE STRONG RLS POLICIES THAT DENY PUBLIC ACCESS

-- 1. EXPLICIT DENY for anon users (no public access allowed)
CREATE POLICY "users_app_deny_anon_all"
ON public.users_app
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. SELECT: Authenticated users can ONLY see their own data
CREATE POLICY "users_app_select_own_authenticated"
ON public.users_app
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid() AND auth_user_id IS NOT NULL);

-- 3. INSERT: Authenticated users can only insert their own data
CREATE POLICY "users_app_insert_own_authenticated"
ON public.users_app
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid() AND auth_user_id IS NOT NULL);

-- 4. UPDATE: Authenticated users can only update their own data
CREATE POLICY "users_app_update_own_authenticated"
ON public.users_app
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid() AND auth_user_id IS NOT NULL)
WITH CHECK (auth_user_id = auth.uid() AND auth_user_id IS NOT NULL);

-- 5. DELETE: Explicitly deny all user deletes
CREATE POLICY "users_app_delete_deny_authenticated"
ON public.users_app
FOR DELETE
TO authenticated
USING (false);

-- 6. Service role has full access for edge functions
CREATE POLICY "users_app_service_all"
ON public.users_app
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_users_app_auth_user_id 
ON public.users_app(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Add comment explaining security model
COMMENT ON TABLE public.users_app IS 
'Contains sensitive user PII. Access restricted by RLS to owner only. Records with NULL auth_user_id (SMS-only users) are only accessible via service_role.';

COMMENT ON COLUMN public.users_app.auth_user_id IS 
'Links to auth.users. NULL only for legacy SMS-only users. New users MUST have auth_user_id.';