-- Fix the Security Definer View issue and complete the security lockdown

-- 1. Remove the problematic security definer view
DROP VIEW IF EXISTS public.users_app_secure_view;

-- 2. Update secure functions to access users_app table directly but with strict limitations
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone_secure(p_phone_e164 text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return the auth_user_id, no other sensitive data
  -- This is the minimal data needed for SMS webhook operations
  SELECT auth_user_id FROM users_app WHERE phone_e164 = p_phone_e164 LIMIT 1;
$$;

-- 3. Remove the overly permissive service policy completely
DROP POLICY IF EXISTS "Service restricted function access only" ON public.users_app;

-- 4. Create an extremely restrictive service policy that only allows function-based access
-- This policy will deny all direct access and only allow specific function operations
CREATE POLICY "Service function access only - no direct queries"
ON public.users_app
FOR ALL
TO service_role
USING (
  -- Only allow access when called from our specific secure functions
  -- This effectively blocks all direct table access from service role
  current_setting('app.current_function', true) IN (
    'update_user_phone_secure',
    'create_user_profile_secure', 
    'get_user_id_by_phone_secure',
    'update_sms_compliance_status'
  )
)
WITH CHECK (
  current_setting('app.current_function', true) IN (
    'update_user_phone_secure',
    'create_user_profile_secure',
    'update_sms_compliance_status'
  )
);

-- 5. Update all secure functions to set the function context
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone_secure(p_phone_e164 text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result uuid;
BEGIN
  -- Set function context for RLS policy
  PERFORM set_config('app.current_function', 'get_user_id_by_phone_secure', true);
  
  -- Get user ID with minimal data exposure
  SELECT auth_user_id INTO result FROM users_app WHERE phone_e164 = p_phone_e164 LIMIT 1;
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_phone_secure(
  p_auth_user_id uuid,
  p_new_phone_e164 text,
  p_new_status text DEFAULT 'active'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected integer;
BEGIN
  -- Set function context for RLS policy
  PERFORM set_config('app.current_function', 'update_user_phone_secure', true);
  
  -- Only allow updates for phone verification and status activation
  UPDATE users_app 
  SET 
    phone_e164 = p_new_phone_e164,
    status = p_new_status
  WHERE auth_user_id = p_auth_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Log the operation
  PERFORM log_service_access('users_app', 'UPDATE_PHONE', p_auth_user_id, 'update_user_phone_secure');
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN rows_affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_auth_user_id uuid,
  p_email text,
  p_phone_e164 text DEFAULT '',
  p_status text DEFAULT 'pending'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Set function context for RLS policy
  PERFORM set_config('app.current_function', 'create_user_profile_secure', true);
  
  -- Validate status
  IF p_status NOT IN ('pending', 'active', 'paused', 'opted_out', 'sms_only') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  INSERT INTO users_app (auth_user_id, email, phone_e164, status)
  VALUES (p_auth_user_id, p_email, p_phone_e164, p_status)
  RETURNING id INTO new_id;
  
  -- Log the profile creation
  PERFORM log_service_access('users_app', 'CREATE_PROFILE', p_auth_user_id, 'create_user_profile_secure');
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sms_compliance_status(
  p_phone_e164 text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set function context for RLS policy
  PERFORM set_config('app.current_function', 'update_sms_compliance_status', true);
  
  -- Only allow specific compliance statuses
  IF p_status NOT IN ('opted_out', 'active', 'sms_only') THEN
    RAISE EXCEPTION 'Invalid compliance status: %', p_status;
  END IF;
  
  -- Update or insert user compliance status
  INSERT INTO users_app (phone_e164, status)
  VALUES (p_phone_e164, p_status)
  ON CONFLICT (phone_e164) 
  DO UPDATE SET status = EXCLUDED.status;
  
  -- Log the compliance change
  PERFORM log_service_access('users_app', 'SMS_COMPLIANCE', NULL, 'update_sms_compliance_status');
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
END;
$$;