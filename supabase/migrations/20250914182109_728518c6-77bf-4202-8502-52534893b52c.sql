-- Fix remaining RLS policy for prompts table
-- The prompts table contains generic prompt templates that should be readable by all authenticated users
-- but only service role should be able to modify them

CREATE POLICY prompts_select_all
ON prompts
FOR SELECT
TO authenticated
USING (active = true);

CREATE POLICY prompts_insert_service_only
ON prompts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY prompts_update_service_only
ON prompts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY prompts_delete_service_only
ON prompts
FOR DELETE
TO service_role
USING (true);