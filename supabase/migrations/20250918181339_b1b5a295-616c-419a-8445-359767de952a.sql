-- Security Enhancement: Granular RLS policies for users_app table (Fixed)
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

-- Enhanced logging function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_func text := current_setting('app.current_function', true);
BEGIN
  -- Log access to sensitive fields (phone, email)
  IF TG_OP IN ('SELECT', 'UPDATE') THEN
    PERFORM log_service_access(
      'users_app_sensitive', 
      TG_OP || '_SENSITIVE', 
      COALESCE(NEW.auth_user_id, OLD.auth_user_id), 
      current_func
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to audit sensitive data access
CREATE TRIGGER audit_users_app_sensitive_access
  AFTER SELECT OR UPDATE ON users_app
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_data_access();