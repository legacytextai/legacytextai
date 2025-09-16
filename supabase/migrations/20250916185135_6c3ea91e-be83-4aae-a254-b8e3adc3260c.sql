-- Fix the status check constraint to allow all valid statuses including 'sms_only'
-- This will resolve the profile creation error

-- Drop the existing constraint if it's too restrictive
ALTER TABLE public.users_app DROP CONSTRAINT IF EXISTS users_app_status_check;

-- Create a new constraint that includes all valid statuses
ALTER TABLE public.users_app 
ADD CONSTRAINT users_app_status_check 
CHECK (status IN ('pending', 'active', 'paused', 'opted_out', 'sms_only'));

-- Ensure the default status is 'pending' (which is valid)
ALTER TABLE public.users_app 
ALTER COLUMN status SET DEFAULT 'pending';