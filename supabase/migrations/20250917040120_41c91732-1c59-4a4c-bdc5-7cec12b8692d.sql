-- Check all phone_e164 values and their status
SELECT phone_e164, COUNT(*) as count, auth_user_id, email, status 
FROM users_app 
GROUP BY phone_e164, auth_user_id, email, status
ORDER BY phone_e164;

-- Test phone number normalization
SELECT normalize_phone_e164('(949) 826-3065') as normalized_phone;

-- Check if there are multiple empty/null phone records
SELECT 
  CASE 
    WHEN phone_e164 IS NULL THEN 'NULL'
    WHEN phone_e164 = '' THEN 'EMPTY_STRING'
    ELSE phone_e164
  END as phone_status,
  COUNT(*) as count
FROM users_app 
GROUP BY phone_e164;