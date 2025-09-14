-- Add check constraint for users_app status field
ALTER TABLE users_app
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active','paused','opted_out'));