-- Fix remaining function search path security warnings
ALTER FUNCTION get_user_id_from_phone(text) SET search_path = public;
ALTER FUNCTION is_otp_active(timestamp with time zone) SET search_path = public;
ALTER FUNCTION link_self_to_phone(text) SET search_path = public;