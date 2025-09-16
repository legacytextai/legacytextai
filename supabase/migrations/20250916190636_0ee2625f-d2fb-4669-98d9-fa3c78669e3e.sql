-- Fix the guard function to allow secure function context
CREATE OR REPLACE FUNCTION public.guard_users_app_sensitive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  current_function text := current_setting('app.current_function', true);
BEGIN
  -- Allow secure functions to bypass guard
  IF current_function IN ('update_user_phone_secure', 'create_user_profile_secure', 'update_sms_compliance_status') THEN
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