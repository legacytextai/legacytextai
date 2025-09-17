-- Clean up any orphaned records for the phone number causing issues
DELETE FROM users_app WHERE phone_e164 = '+19498263065' AND (auth_user_id IS NULL OR auth_user_id NOT IN (SELECT id FROM auth.users));

-- Check if the handle_new_user trigger exists and fix it if needed
-- First, let's make sure the trigger is created properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only insert if the user doesn't already exist
  INSERT INTO public.users_app (auth_user_id, email, phone_e164, status)
  SELECT NEW.id, NEW.email, COALESCE(NEW.phone, ''), 'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users_app WHERE auth_user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- Make sure the trigger exists on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();