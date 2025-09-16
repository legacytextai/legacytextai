-- Additional secure functions for SMS compliance operations

-- Function to handle SMS compliance (STOP/START operations)
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
  PERFORM log_service_access('users_app', 'SMS_COMPLIANCE', NULL, 'sms-compliance');
END;
$$;

-- Update the create_user_profile_secure function to handle null auth_user_id
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
  -- Validate status
  IF p_status NOT IN ('pending', 'active', 'paused', 'opted_out', 'sms_only') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  INSERT INTO users_app (auth_user_id, email, phone_e164, status)
  VALUES (p_auth_user_id, p_email, p_phone_e164, p_status)
  RETURNING id INTO new_id;
  
  -- Log the profile creation
  PERFORM log_service_access('users_app', 'CREATE_PROFILE', p_auth_user_id, 'create-profile');
  
  RETURN new_id;
END;
$$;