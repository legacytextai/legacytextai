-- Clean up all remaining user data before fresh signup test
-- This ensures a completely clean state for testing

-- Clean up OTP codes for the test phone number
DELETE FROM otp_codes WHERE new_phone_e164 = '+19498749996';

-- Clean up messages for the test phone number  
DELETE FROM messages WHERE phone_e164 = '+19498749996';

-- Clean up any service access logs that might reference the user
DELETE FROM service_access_log WHERE function_name LIKE '%phone%' AND accessed_at > NOW() - INTERVAL '24 hours';

-- Clean up any journal entries for the test phone number
DELETE FROM journal_entries WHERE phone_e164 = '+19498749996';

-- Clean up any daily prompts that might be associated
DELETE FROM daily_prompts WHERE name LIKE '%abdulbidiwi%' OR name LIKE '%Abdul%';

-- Also clean up any expired OTP codes while we're at it
DELETE FROM otp_codes WHERE expires_at < NOW();