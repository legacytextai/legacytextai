-- CRITICAL SECURITY FIX: Replace overly permissive journal_entries SELECT policy
-- This policy currently allows ANY authenticated user to read ALL journal entries

-- Drop the vulnerable policy
DROP POLICY IF EXISTS read_own_entries_future_frontend ON journal_entries;

-- Create a secure policy that only allows users to read their own entries
CREATE POLICY journal_entries_select_own_only
ON journal_entries
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Verify no other overly permissive policies exist
-- The remaining policies should be properly scoped to user_id = auth.uid() or service-only