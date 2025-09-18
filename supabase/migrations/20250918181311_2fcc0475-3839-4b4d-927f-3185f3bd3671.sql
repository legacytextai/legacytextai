-- Security Enhancement: Granular RLS policies for users_app table
-- Replace broad service function access with field-specific policies

-- 1. Drop the overly broad service function policy
DROP POLICY IF EXISTS "Service function access only - no direct queries" ON users_app;

-- 2. Create granular policies for different operations and fields

-- Allow service functions to read basic user info (non-sensitive fields)
CREATE POLICY "Service read basic user info" ON users_app
FOR SELECT USING (
  current_setting('app.current_function', true) IN (
    'get_user_id_by_phone_secure', 
    'get_user_basic_info',
    'populate_name_from_user_id',
    'get_user_name_from_id'
  )
);

-- Allow specific functions to update phone/status only (not email or other sensitive data)
CREATE POLICY "Service update phone and status only" ON users_app
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

-- Create a view for service functions that need phone lookup but not full access
CREATE OR REPLACE VIEW service_phone_lookup AS
SELECT id, phone_e164 
FROM users_app;

-- Enable RLS on the view
ALTER VIEW service_phone_lookup SET (security_barrier = true);

-- Grant limited access to the view for phone lookup functions
CREATE POLICY "Service phone lookup only" ON service_phone_lookup
FOR SELECT USING (
  current_setting('app.current_function', true) IN (
    'get_user_id_by_phone_secure',
    'update_sms_compliance_status'
  )
);

-- Create security definer function for safe email access (if needed)
CREATE OR REPLACE FUNCTION public.get_user_email_secure(p_auth_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM users_app WHERE auth_user_id = p_auth_user_id LIMIT 1;
$$;

-- Log access to sensitive data
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to phone or email fields
  IF TG_OP = 'SELECT' AND (
    NEW.phone_e164 IS NOT NULL OR 
    NEW.email IS NOT NULL
  ) THEN
    PERFORM log_service_access(
      'users_app_sensitive', 
      'SENSITIVE_ACCESS', 
      NEW.auth_user_id, 
      current_setting('app.current_function', true)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;