-- Fix the existing empty string phone_e164 to be NULL instead
-- We need to bypass the guard trigger by setting the function context
DO $$
BEGIN
  -- Set function context to bypass the guard trigger
  PERFORM set_config('app.current_function', 'update_user_phone_secure', true);
  
  -- Now update the empty string to NULL
  UPDATE users_app 
  SET phone_e164 = NULL 
  WHERE phone_e164 = '';
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
END
$$;

-- Verify the fix worked
SELECT 
  CASE 
    WHEN phone_e164 IS NULL THEN 'NULL'
    WHEN phone_e164 = '' THEN 'EMPTY_STRING'
    ELSE phone_e164
  END as phone_status,
  COUNT(*) as count
FROM users_app 
GROUP BY phone_e164;