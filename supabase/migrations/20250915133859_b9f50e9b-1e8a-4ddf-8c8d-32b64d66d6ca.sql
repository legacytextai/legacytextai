-- Add service role policies for users_app table
-- These policies allow service role (edge functions) to perform operations
-- while maintaining security for regular authenticated users

-- Service role can insert user profiles (for user creation flows)
CREATE POLICY "users_app_insert_service" 
ON public.users_app 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Service role can update user profiles (for linking phone numbers, etc)  
CREATE POLICY "users_app_update_service"
ON public.users_app 
FOR UPDATE 
TO service_role
USING (true)
WITH CHECK (true);

-- Service role can select user profiles (for lookups in edge functions)
CREATE POLICY "users_app_select_service"
ON public.users_app 
FOR SELECT 
TO service_role
USING (true);

-- Note: We intentionally do NOT add DELETE policy for service role
-- This maintains security by preventing accidental user deletion