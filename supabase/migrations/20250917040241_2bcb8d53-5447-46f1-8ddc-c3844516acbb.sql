-- Fix the existing empty string phone_e164 to be NULL instead
-- This will resolve the unique constraint violation
UPDATE users_app 
SET phone_e164 = NULL 
WHERE phone_e164 = '';

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