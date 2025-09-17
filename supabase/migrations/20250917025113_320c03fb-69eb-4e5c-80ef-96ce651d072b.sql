-- Create function to automatically create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert a new user profile when a user signs up
  INSERT INTO public.users_app (auth_user_id, email, phone_e164, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, ''),
    'pending'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create the missing user record for the current problematic user
INSERT INTO public.users_app (auth_user_id, email, phone_e164, status)
VALUES (
  '25139c2e-d660-4252-9655-fc29ae79f0bc',
  'tsaidi05@hotmail.com',
  '',
  'pending'
)
ON CONFLICT (auth_user_id) DO NOTHING;