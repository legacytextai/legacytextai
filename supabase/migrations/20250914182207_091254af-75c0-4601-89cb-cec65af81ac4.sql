-- Fix function search path security warning

-- Update the existing function to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_id_from_phone(phone text)
RETURNS uuid
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users_app WHERE phone_e164 = phone LIMIT 1;
$$;

-- Update the send_welcome_email function to have proper search_path
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
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