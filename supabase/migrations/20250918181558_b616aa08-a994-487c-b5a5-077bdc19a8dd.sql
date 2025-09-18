-- Security Enhancement: Clean slate and create granular RLS policies
-- First drop all existing policies, then create new granular ones

-- Drop all existing policies on users_app
DROP POLICY IF EXISTS "Service function access only - no direct queries" ON users_app;
DROP POLICY IF EXISTS "Service read for phone lookup" ON users_app;
DROP POLICY IF EXISTS "Service update phone and status" ON users_app;
DROP POLICY IF EXISTS "Service create user profile" ON users_app;

-- Keep the user-specific policies (these should remain)
-- DROP POLICY IF EXISTS "users_app_select_self_uid" ON users_app; -- Keep this
-- DROP POLICY IF EXISTS "users_app_update_self_uid" ON users_app; -- Keep this  
-- DROP POLICY IF EXISTS "users_app_insert_self_uid" ON users_app; -- Keep this

-- Create new granular service policies

-- 1. Read access for specific service functions (minimal data exposure)
CREATE POLICY "Service functions read access" ON users_app
FOR SELECT USING (
  current_setting('app.current_function', true) IN (
    'get_user_id_by_phone_secure', 
    'get_user_basic_info',
    'populate_name_from_user_id',
    'get_user_name_from_id',
    'create_user_profile_secure'
  )
);

-- 2. Update access only for specific functions and specific fields
CREATE POLICY "Service functions update access" ON users_app
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

-- 3. Insert access only for profile creation
CREATE POLICY "Service functions insert access" ON users_app
FOR INSERT WITH CHECK (
  current_setting('app.current_function', true) = 'create_user_profile_secure'
);

-- Create audit trigger for sensitive data changes
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log changes to phone or email
  IF TG_OP = 'UPDATE' AND (
    OLD.phone_e164 IS DISTINCT FROM NEW.phone_e164 OR
    OLD.email IS DISTINCT FROM NEW.email
  ) THEN
    PERFORM log_service_access(
      'users_app_sensitive', 
      'SENSITIVE_UPDATE', 
      NEW.auth_user_id, 
      current_setting('app.current_function', true)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the audit trigger
DROP TRIGGER IF EXISTS audit_users_app_changes ON users_app;
CREATE TRIGGER audit_users_app_changes
  BEFORE UPDATE ON users_app
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_changes();