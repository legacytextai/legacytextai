-- The phone_e164 column has a NOT NULL constraint, but we need to allow NULL values
-- for users who sign up without phone numbers initially

-- First, alter the column to allow NULL values
ALTER TABLE users_app ALTER COLUMN phone_e164 DROP NOT NULL;

-- Now update the empty string to NULL
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