-- Clean up orphaned user records and add cascade delete
-- First, delete any orphaned records where auth_user_id doesn't exist in auth.users
DELETE FROM users_app 
WHERE auth_user_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = users_app.auth_user_id
);

-- Also clean up any records with temp phone numbers that are stuck
DELETE FROM users_app 
WHERE phone_e164 LIKE 'temp_%' 
AND status = 'paused';

-- Add foreign key constraint with cascade delete to prevent future orphaned records
ALTER TABLE users_app 
ADD CONSTRAINT users_app_auth_user_id_fkey 
FOREIGN KEY (auth_user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;