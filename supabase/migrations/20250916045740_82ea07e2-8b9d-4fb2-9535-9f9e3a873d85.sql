-- Fix the relationship - user_id references users_app.id, not users_app.auth_user_id
UPDATE public.journal_entries 
SET name = users_app.name 
FROM public.users_app 
WHERE journal_entries.user_id = users_app.id 
AND users_app.name IS NOT NULL;

UPDATE public.daily_prompts 
SET name = users_app.name 
FROM public.users_app 
WHERE daily_prompts.user_id = users_app.id 
AND users_app.name IS NOT NULL;

-- Drop the old triggers that use the wrong relationship
DROP TRIGGER IF EXISTS populate_daily_prompts_name ON public.daily_prompts;
DROP TRIGGER IF EXISTS populate_journal_entries_name ON public.journal_entries;

-- Update the function to use the correct relationship
CREATE OR REPLACE FUNCTION public.get_user_name_from_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM users_app WHERE id = p_user_id LIMIT 1;
$$;

-- Recreate triggers with correct relationship
CREATE TRIGGER populate_daily_prompts_name
  BEFORE INSERT OR UPDATE OF user_id ON public.daily_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_name_from_user_id();

CREATE TRIGGER populate_journal_entries_name
  BEFORE INSERT OR UPDATE OF user_id ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_name_from_user_id();