-- Test if the phone number constraint is the issue
-- Check for any existing records with similar phone numbers
SELECT phone_e164, count(*) as count FROM users_app 
WHERE phone_e164 LIKE '%949%' OR phone_e164 LIKE '%826%' OR phone_e164 LIKE '%3065%'
GROUP BY phone_e164;

-- Also check if there are any unique constraints that might be causing issues
SELECT conname, contype, pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' AND t.relname = 'users_app' AND contype = 'u';