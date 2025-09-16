-- Clean up redundant service policies - keep only the most restrictive one
DROP POLICY IF EXISTS "Service can insert via secure function only" ON public.users_app;
DROP POLICY IF EXISTS "Service can update via secure function only" ON public.users_app;

-- The "Service function access only - no direct queries" policy is the most secure
-- and covers all operations (ALL command) with strict function context checking