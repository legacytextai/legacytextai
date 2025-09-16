-- Add name columns to tables with user_id
ALTER TABLE public.daily_prompts 
ADD COLUMN name TEXT;

ALTER TABLE public.journal_entries 
ADD COLUMN name TEXT;

-- Populate existing data by joining with users_app table
UPDATE public.daily_prompts 
SET name = users_app.name 
FROM public.users_app 
WHERE daily_prompts.user_id = users_app.auth_user_id;

UPDATE public.journal_entries 
SET name = users_app.name 
FROM public.users_app 
WHERE journal_entries.user_id = users_app.auth_user_id;

-- Create function to get user name from user_id
CREATE OR REPLACE FUNCTION public.get_user_name_from_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM users_app WHERE auth_user_id = p_user_id LIMIT 1;
$$;

-- Create trigger function to auto-populate name field
CREATE OR REPLACE FUNCTION public.populate_name_from_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the name from users_app table
  NEW.name := public.get_user_name_from_id(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create triggers for daily_prompts
CREATE TRIGGER populate_daily_prompts_name
  BEFORE INSERT OR UPDATE OF user_id ON public.daily_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_name_from_user_id();

-- Create triggers for journal_entries  
CREATE TRIGGER populate_journal_entries_name
  BEFORE INSERT OR UPDATE OF user_id ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_name_from_user_id();