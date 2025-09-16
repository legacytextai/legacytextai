-- Remove conflicting status constraint that blocks 'pending' status
-- This constraint was preventing users from being created with the default 'pending' status
ALTER TABLE users_app DROP CONSTRAINT IF EXISTS users_status_check;