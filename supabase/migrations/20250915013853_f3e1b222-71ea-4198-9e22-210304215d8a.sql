-- Fix remaining function search paths
CREATE OR REPLACE FUNCTION public.guard_users_app_sensitive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE 
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  -- No JWT => likely service role (edge function). Allow.
  IF claims IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164 THEN
    RAISE EXCEPTION 'Clients cannot change phone_e164';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Clients cannot change status';
  END IF;

  RETURN NEW;
END$$;

CREATE OR REPLACE FUNCTION public.touch_last_login()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  NEW.last_login_at := now();
  RETURN NEW;
END$$;

CREATE OR REPLACE FUNCTION public.send_welcome_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
begin
  perform
    net.http_post(
      url := 'https://toxadhuqzdydliplhrws.functions.supabase.co/send-welcome-email',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  return NEW;
end;
$$;