-- Create a recovery function that bypasses client restrictions
CREATE OR REPLACE FUNCTION public.recover_stuck_user_account(p_auth_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Clear temp phone and reset status (bypasses trigger because it's SECURITY DEFINER)
  UPDATE users_app 
  SET 
    status = 'pending',
    phone_e164 = ''
  WHERE auth_user_id = p_auth_user_id;
  
  -- Clear any stuck OTP codes
  DELETE FROM otp_codes WHERE user_auth_id = p_auth_user_id;
  
  RETURN result;
END;
$$;