-- Fix remaining RLS policy for prompts table

-- Enable RLS on prompts table if not already enabled
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS prompts_select_all ON prompts;
DROP POLICY IF EXISTS prompts_insert_admin ON prompts;
DROP POLICY IF EXISTS prompts_update_admin ON prompts;
DROP POLICY IF EXISTS prompts_delete_admin ON prompts;

-- Create RLS policies for prompts table
-- All authenticated users can read active prompts (needed for prompt system)
CREATE POLICY prompts_select_active
ON prompts
FOR SELECT
TO authenticated
USING (active = true);

-- Service role can select all prompts (for system operations)
CREATE POLICY prompts_select_service
ON prompts
FOR SELECT
TO service_role
USING (true);

-- Only service role can insert prompts (admin function)
CREATE POLICY prompts_insert_service
ON prompts
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users cannot insert prompts
CREATE POLICY prompts_insert_deny_user
ON prompts
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Only service role can update prompts
CREATE POLICY prompts_update_service
ON prompts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Users cannot update prompts
CREATE POLICY prompts_update_deny_user
ON prompts
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Only service role can delete prompts
CREATE POLICY prompts_delete_service
ON prompts
FOR DELETE
TO service_role
USING (true);

-- Users cannot delete prompts
CREATE POLICY prompts_delete_deny_user
ON prompts
FOR DELETE
TO authenticated
USING (false);