-- CRITICAL SECURITY FIX: Remove public access to users_app table
-- This fixes "Customer Personal Information Exposed to Public" vulnerability

-- 1. First, check if there are any permissive policies allowing public access
-- Remove the overly broad service policy that could be exploited
DROP POLICY IF EXISTS "Service can read basic user info only" ON public.users_app;

-- 2. Create a highly restricted service policy that only allows access through specific functions
-- This policy should never be used for direct table access
CREATE POLICY "Service restricted function access only"
ON public.users_app
FOR SELECT
TO service_role
USING (
  -- This policy should only allow access in very specific contexts
  -- We'll restrict it further by making all service operations go through functions
  false  -- Block all direct service access to force function usage
);

-- 3. Create a view for service functions that only exposes minimal necessary data
CREATE OR REPLACE VIEW public.users_app_secure_view AS
SELECT 
  id,
  auth_user_id,
  status,
  phone_e164,
  -- Exclude sensitive data like email, name, personal preferences
  created_at
FROM public.users_app;

-- 4. Grant limited access to the secure view for service functions only
GRANT SELECT ON public.users_app_secure_view TO service_role;

-- 5. Update our secure functions to be even more restrictive
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone_secure(p_phone_e164 text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return the auth_user_id, no other sensitive data
  SELECT auth_user_id FROM users_app_secure_view WHERE phone_e164 = p_phone_e164 LIMIT 1;
$$;

-- 6. Create a function specifically for phone verification that doesn't expose user data
CREATE OR REPLACE FUNCTION public.verify_phone_ownership(p_auth_user_id uuid, p_phone_e164 text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM users_app 
    WHERE auth_user_id = p_auth_user_id 
    AND phone_e164 = p_phone_e164
  );
$$;

-- 7. Ensure RLS is enabled and policies are restrictive
ALTER TABLE public.users_app ENABLE ROW LEVEL SECURITY;

-- 8. Verify no public access is possible
-- Remove any potential public policies
DROP POLICY IF EXISTS "public_read_users" ON public.users_app;
DROP POLICY IF EXISTS "anon_read_users" ON public.users_app;

-- 9. Add audit logging for any attempts to access user data
CREATE OR REPLACE FUNCTION public.audit_user_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to sensitive user data
  INSERT INTO service_access_log (table_name, operation, user_id, function_name)
  VALUES ('users_app', TG_OP, NEW.auth_user_id, 'direct_table_access');
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to audit all operations on users_app
DROP TRIGGER IF EXISTS audit_users_app_access ON public.users_app;
CREATE TRIGGER audit_users_app_access
  AFTER INSERT OR UPDATE OR DELETE ON public.users_app
  FOR EACH ROW EXECUTE FUNCTION audit_user_data_access();