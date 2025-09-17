-- Check if there are any references to Talal's phone number in other tables or logs
-- Let's also look at when his account was created and if there were any OTP attempts

SELECT * FROM otp_codes WHERE user_auth_id = '25139c2e-d660-4252-9655-fc29ae79f0bc';

-- Check if there's any pattern in his user creation
SELECT auth_user_id, email, name, phone_e164, status, created_at 
FROM users_app 
WHERE auth_user_id = '25139c2e-d660-4252-9655-fc29ae79f0bc';