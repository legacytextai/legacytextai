-- Add dedication column to users_app table for storing custom dedication text
ALTER TABLE public.users_app ADD COLUMN dedication text;