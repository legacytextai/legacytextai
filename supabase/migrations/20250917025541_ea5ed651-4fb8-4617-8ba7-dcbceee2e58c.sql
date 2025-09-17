-- Fix the recovery function to properly clear temp phone numbers
CREATE OR REPLACE FUNCTION public.recover_stuck_user_account(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_data users_app;
  is_stuck boolean := false;
  result jsonb;
BEGIN
  -- Get current user data
  SELECT * INTO user_data FROM users_app WHERE auth_user_id = p_auth_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user is stuck
  is_stuck := user_data.status = 'paused' OR 
              (user_data.phone_e164 IS NOT NULL AND user_data.phone_e164 LIKE 'temp_%');
  
  IF NOT is_stuck THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not in a stuck state');
  END IF;
  
  -- Store previous state for response
  result := jsonb_build_object(
    'success', true,
    'message', 'User account recovered successfully',
    'previous_state', jsonb_build_object(
      'status', user_data.status,
      'phone_e164', user_data.phone_e164
    )
  );
  
  -- Set function context for RLS policy bypass
  PERFORM set_config('app.current_function', 'recover_stuck_user_account', true);
  
  -- Clear temp phone and reset status (this now bypasses the guard trigger)
  UPDATE users_app 
  SET 
    status = 'pending',
    phone_e164 = ''
  WHERE auth_user_id = p_auth_user_id;
  
  -- Clear any stuck OTP codes
  DELETE FROM otp_codes WHERE user_auth_id = p_auth_user_id;
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN result;
END;
$$;

-- Update the guard function to allow the recovery function to modify phone_e164
CREATE OR REPLACE FUNCTION public.guard_users_app_sensitive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE 
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  current_function text := current_setting('app.current_function', true);
BEGIN
  -- Allow secure functions to bypass guard
  IF current_function IN ('update_user_phone_secure', 'create_user_profile_secure', 'update_sms_compliance_status', 'recover_stuck_user_account') THEN
    RETURN NEW;
  END IF;

  -- No JWT => likely service role (edge function). Allow.
  IF claims IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block client updates to sensitive fields
  IF NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164 THEN
    RAISE EXCEPTION 'Clients cannot change phone_e164';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Clients cannot change status';
  END IF;

  RETURN NEW;
END
$$;