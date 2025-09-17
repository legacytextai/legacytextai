-- Fix the handle_new_user trigger to handle empty phone numbers properly
-- The issue is the unique constraint on phone_e164 - we can't have multiple empty strings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only insert if the user doesn't already exist
  INSERT INTO public.users_app (auth_user_id, email, phone_e164, status)
  SELECT 
    NEW.id, 
    NEW.email, 
    CASE 
      WHEN NEW.phone IS NULL OR NEW.phone = '' THEN NULL  -- Use NULL instead of empty string
      ELSE NEW.phone 
    END, 
    'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users_app WHERE auth_user_id = NEW.id
  );

  RETURN NEW;
END;
$$;