-- Fix Salah's account by updating his users_app record with his real phone number
UPDATE users_app 
SET 
  phone_e164 = '+19495472875',
  status = 'active'
WHERE auth_user_id = 'f2c1b069-f6bc-44e7-86c8-9eaf54dd5650';

-- Clean up the OTP code since we're manually fixing this
DELETE FROM otp_codes 
WHERE user_auth_id = 'f2c1b069-f6bc-44e7-86c8-9eaf54dd5650';