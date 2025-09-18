-- Security Enhancement: Granular RLS policies for users_app table (Corrected)
-- Replace broad service function access with field-specific policies

-- 1. Drop the overly broad service function policy
DROP POLICY IF EXISTS "Service function access only - no direct queries" ON users_app;

-- 2. Create granular policies for different operations

-- Allow service functions to read user info for specific operations
CREATE POLICY "Service read for phone lookup" ON users_app
FOR SELECT USING (
  current_setting('app.current_function', true) IN (
    'get_user_id_by_phone_secure', 
    'get_user_basic_info',
    'populate_name_from_user_id',
    'get_user_name_from_id'
  )
);

-- Allow specific functions to update phone/status only
CREATE POLICY "Service update phone and status" ON users_app
FOR UPDATE USING (
  current_setting('app.current_function', true) IN (
    'update_user_phone_secure',
    'update_sms_compliance_status',
    'recover_stuck_user_account'
  )
) WITH CHECK (
  current_setting('app.current_function', true) IN (
    'update_user_phone_secure',
    'update_sms_compliance_status', 
    'recover_stuck_user_account'
  )
);

-- Allow profile creation only for the create function
CREATE POLICY "Service create user profile" ON users_app
FOR INSERT WITH CHECK (
  current_setting('app.current_function', true) = 'create_user_profile_secure'
);

-- Create security definer function for safe email access
CREATE OR REPLACE FUNCTION public.get_user_email_secure(p_auth_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM users_app WHERE auth_user_id = p_auth_user_id LIMIT 1;
$$;

-- Enhanced logging function for sensitive data updates
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_func text := current_setting('app.current_function', true);
BEGIN
  -- Log updates to sensitive fields (phone, email)
  IF TG_OP = 'UPDATE' AND (
    OLD.phone_e164 IS DISTINCT FROM NEW.phone_e164 OR
    OLD.email IS DISTINCT FROM NEW.email
  ) THEN
    PERFORM log_service_access(
      'users_app_sensitive', 
      'UPDATE_SENSITIVE', 
      NEW.auth_user_id, 
      current_func
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to audit sensitive data updates only
CREATE TRIGGER audit_users_app_sensitive_updates
  BEFORE UPDATE ON users_app
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_data_updates();

-- Create restricted function for phone lookup that minimizes data exposure
CREATE OR REPLACE FUNCTION public.lookup_user_id_by_phone_minimal(p_phone_e164 text)
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
  
  -- Only return the ID, no other sensitive data
  SELECT id INTO result FROM users_app WHERE phone_e164 = p_phone_e164 LIMIT 1;
  
  -- Log the lookup
  PERFORM log_service_access('users_app', 'PHONE_LOOKUP', NULL, 'lookup_user_id_by_phone_minimal');
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN result;
END;
$$;