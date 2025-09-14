-- Fix critical security vulnerability: Add RLS policies for user data tables

-- 1. Enable RLS on tables that don't have it yet
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to rebuild them properly
DROP POLICY IF EXISTS daily_prompts_select_own ON daily_prompts;
DROP POLICY IF EXISTS daily_prompts_insert_own ON daily_prompts;
DROP POLICY IF EXISTS daily_prompts_update_own ON daily_prompts;
DROP POLICY IF EXISTS daily_prompts_delete_own ON daily_prompts;

DROP POLICY IF EXISTS messages_select_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;
DROP POLICY IF EXISTS messages_update_own ON messages;
DROP POLICY IF EXISTS messages_delete_own ON messages;

DROP POLICY IF EXISTS journal_entries_insert_own ON journal_entries;
DROP POLICY IF EXISTS journal_entries_update_own ON journal_entries;
DROP POLICY IF EXISTS journal_entries_delete_own ON journal_entries;

-- 3. Create comprehensive RLS policies for daily_prompts table
-- Users can only access their own prompts
CREATE POLICY daily_prompts_select_own
ON daily_prompts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can insert prompts for users (for the daily prompt system)
CREATE POLICY daily_prompts_insert_service
ON daily_prompts
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users cannot directly insert prompts (only service can)
CREATE POLICY daily_prompts_insert_deny_user
ON daily_prompts
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Users can update their own prompts (for response tracking)
CREATE POLICY daily_prompts_update_own
ON daily_prompts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can update any prompt (for system operations)
CREATE POLICY daily_prompts_update_service
ON daily_prompts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Users can delete their own prompts
CREATE POLICY daily_prompts_delete_own
ON daily_prompts
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4. Create comprehensive RLS policies for messages table
-- Create function to get user_id from phone number for messages table
CREATE OR REPLACE FUNCTION get_user_id_from_phone(phone text)
RETURNS uuid
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users_app WHERE phone_e164 = phone LIMIT 1;
$$;

-- Users can only see messages from their phone number
CREATE POLICY messages_select_own
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users_app 
    WHERE phone_e164 = messages.phone_e164 
    AND id = auth.uid()
  )
);

-- Service role can insert messages (for SMS processing)
CREATE POLICY messages_insert_service
ON messages
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users cannot directly insert messages
CREATE POLICY messages_insert_deny_user
ON messages
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Users can update their own messages
CREATE POLICY messages_update_own
ON messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users_app 
    WHERE phone_e164 = messages.phone_e164 
    AND id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users_app 
    WHERE phone_e164 = messages.phone_e164 
    AND id = auth.uid()
  )
);

-- Service role can update any message
CREATE POLICY messages_update_service
ON messages
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Users can delete their own messages
CREATE POLICY messages_delete_own
ON messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users_app 
    WHERE phone_e164 = messages.phone_e164 
    AND id = auth.uid()
  )
);

-- 5. Complete RLS policies for journal_entries table (already has SELECT policy)
-- Users can insert their own entries
CREATE POLICY journal_entries_insert_own
ON journal_entries
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service role can insert entries (for SMS processing)
CREATE POLICY journal_entries_insert_service
ON journal_entries
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can update their own entries
CREATE POLICY journal_entries_update_own
ON journal_entries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can update any entry (for AI processing)
CREATE POLICY journal_entries_update_service
ON journal_entries
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Users can delete their own entries
CREATE POLICY journal_entries_delete_own
ON journal_entries
FOR DELETE
TO authenticated
USING (user_id = auth.uid());