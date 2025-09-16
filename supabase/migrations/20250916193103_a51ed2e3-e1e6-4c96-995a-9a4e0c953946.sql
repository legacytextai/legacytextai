-- Fix get_user_id_by_phone_secure to return the correct user ID
CREATE OR REPLACE FUNCTION public.get_user_id_by_phone_secure(p_phone_e164 text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result uuid;
BEGIN
  -- Set function context for RLS policy
  PERFORM set_config('app.current_function', 'get_user_id_by_phone_secure', true);
  
  -- Get user ID (PRIMARY KEY, not auth_user_id) with minimal data exposure
  SELECT id INTO result FROM users_app WHERE phone_e164 = p_phone_e164 LIMIT 1;
  
  -- Clear the context
  PERFORM set_config('app.current_function', '', true);
  
  RETURN result;
END;
$function$;