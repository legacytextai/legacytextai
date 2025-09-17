-- Fix the RLS policy for journal_entries to properly match authenticated users
-- Current policy is likely using simple auth.uid() = user_id, but user_id references users_app.id not auth.uid()

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "journal_entries_select_own_only" ON journal_entries;

-- Create a corrected policy that properly links auth.uid() to users_app.id to journal_entries.user_id
CREATE POLICY "journal_entries_select_own_only" 
ON journal_entries 
FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM users_app WHERE auth_user_id = auth.uid()
  )
);