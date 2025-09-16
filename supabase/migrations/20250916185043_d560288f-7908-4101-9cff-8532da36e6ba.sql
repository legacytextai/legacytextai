-- Fix the status check constraint to allow the new 'sms_only' status
-- This will resolve the profile creation error

-- First, let's see what the current constraint allows
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.users_app'::regclass 
AND conname LIKE '%status%';

-- Drop the existing constraint if it's too restrictive
ALTER TABLE public.users_app DROP CONSTRAINT IF EXISTS users_app_status_check;

-- Create a new constraint that includes all valid statuses
ALTER TABLE public.users_app 
ADD CONSTRAINT users_app_status_check 
CHECK (status IN ('pending', 'active', 'paused', 'opted_out', 'sms_only'));

-- Also ensure the default status is valid
ALTER TABLE public.users_app 
ALTER COLUMN status SET DEFAULT 'pending';