-- Fix security issues: Replace overly permissive RLS policies with restricted ones

-- Drop the problematic "allow all" service policies
DROP POLICY IF EXISTS "Service can manage all exports" ON exports;
DROP POLICY IF EXISTS "Service can manage all weekly blasts" ON weekly_blasts;

-- Create new restrictive service policies that only allow service role access
CREATE POLICY "Service role can manage all exports" ON exports
FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Service role can manage all weekly blasts" ON weekly_blasts
FOR ALL USING (
  auth.jwt() ->> 'role' = 'service_role'
);