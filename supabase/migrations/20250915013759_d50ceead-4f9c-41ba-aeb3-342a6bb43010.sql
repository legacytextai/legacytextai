-- Fix the orphaned profile issue by cleaning up unlinked profiles
DELETE FROM users_app WHERE auth_user_id IS NULL;

-- Add a function to safely normalize phone numbers for matching
CREATE OR REPLACE FUNCTION normalize_phone_e164(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return null if input is null or empty
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters except the leading +
  phone_input := regexp_replace(phone_input, '[^\d+]', '', 'g');
  
  -- If it doesn't start with +, add it if it looks like a full number
  IF NOT phone_input ~ '^\+' AND length(phone_input) >= 10 THEN
    phone_input := '+' || phone_input;
  END IF;
  
  -- If it starts with +1 and is 12 chars, it's likely correct
  -- If it starts with + but is 11 chars, add the 1
  IF phone_input ~ '^\+\d{11}$' AND NOT phone_input ~ '^\+1' THEN
    phone_input := '+1' || substring(phone_input from 2);
  END IF;
  
  RETURN phone_input;
END;
$$;