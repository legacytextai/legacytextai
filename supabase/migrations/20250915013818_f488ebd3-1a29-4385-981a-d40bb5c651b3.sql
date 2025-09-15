-- Fix search path security warnings
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix other function search paths
CREATE OR REPLACE FUNCTION public.ensure_user_self(p_email text DEFAULT NULL::text)
 RETURNS users_app
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE 
  r users_app;
BEGIN
  SELECT * INTO r FROM users_app WHERE auth_user_id = auth.uid();
  
  IF NOT FOUND THEN
    INSERT INTO users_app (auth_user_id, email, status, phone_e164)
    VALUES (auth.uid(), p_email, 'pending', '')
    RETURNING * INTO r;
  ELSE
    IF p_email IS NOT NULL AND (r.email IS NULL OR r.email <> p_email) THEN
      UPDATE users_app SET email = p_email WHERE id = r.id RETURNING * INTO r;
    END IF;
  END IF;
  
  RETURN r;
END$$;

CREATE OR REPLACE FUNCTION public.get_user_id_from_phone(phone text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $$
  SELECT id FROM users_app WHERE phone_e164 = phone LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.link_self_to_phone(p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  UPDATE users_app
     SET auth_user_id = auth.uid()
   WHERE phone_e164 = p_phone
     AND auth_user_id IS NULL;
END$$;