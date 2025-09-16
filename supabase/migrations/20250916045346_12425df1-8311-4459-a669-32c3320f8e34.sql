-- Update journal_entries with names from users_app where names exist
UPDATE public.journal_entries 
SET name = users_app.name 
FROM public.users_app 
WHERE journal_entries.user_id = users_app.auth_user_id 
AND users_app.name IS NOT NULL;

-- Update daily_prompts with names from users_app where names exist  
UPDATE public.daily_prompts 
SET name = users_app.name 
FROM public.users_app 
WHERE daily_prompts.user_id = users_app.auth_user_id 
AND users_app.name IS NOT NULL;