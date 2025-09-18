-- Fix RLS policies for journal_entries DELETE and UPDATE operations
-- The current policies incorrectly compare user_id (users_app.id) with auth.uid() (auth_user_id)

-- 1. Drop existing broken DELETE policy
DROP POLICY IF EXISTS "journal_entries_delete_own" ON journal_entries;

-- 2. Create correct DELETE policy
CREATE POLICY "journal_entries_delete_own" ON journal_entries
FOR DELETE USING (
  user_id IN (
    SELECT users_app.id 
    FROM users_app 
    WHERE users_app.auth_user_id = auth.uid()
  )
);

-- 3. Drop existing broken UPDATE policy  
DROP POLICY IF EXISTS "journal_entries_update_own" ON journal_entries;

-- 4. Create correct UPDATE policy
CREATE POLICY "journal_entries_update_own" ON journal_entries
FOR UPDATE USING (
  user_id IN (
    SELECT users_app.id 
    FROM users_app 
    WHERE users_app.auth_user_id = auth.uid()
  )
) WITH CHECK (
  user_id IN (
    SELECT users_app.id 
    FROM users_app 
    WHERE users_app.auth_user_id = auth.uid()
  )
);