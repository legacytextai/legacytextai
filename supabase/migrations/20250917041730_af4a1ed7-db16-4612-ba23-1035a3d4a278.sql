-- Update Talal's account with correct phone number and active status
-- Using the secure function to bypass RLS and trigger guards

-- First, let's update using the secure function for phone update
SELECT update_user_phone_secure(
  '25139c2e-d660-4252-9655-fc29ae79f0bc'::uuid,
  '+17147679495',
  'active'
);

-- Also update his Auth profile to include the phone number
UPDATE auth.users 
SET phone = '+17147679495',
    phone_confirmed_at = now(),
    updated_at = now()
WHERE id = '25139c2e-d660-4252-9655-fc29ae79f0bc';

-- Verify the update worked
SELECT auth_user_id, email, name, phone_e164, status, created_at 
FROM users_app 
WHERE auth_user_id = '25139c2e-d660-4252-9655-fc29ae79f0bc';