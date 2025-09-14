-- Enable RLS on otp_codes table
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes FORCE ROW LEVEL SECURITY;

-- Only authenticated users can manage their own OTP codes
CREATE POLICY otp_codes_select_own
ON otp_codes FOR SELECT TO authenticated
USING (user_auth_id = auth.uid());

CREATE POLICY otp_codes_insert_own
ON otp_codes FOR INSERT TO authenticated
WITH CHECK (user_auth_id = auth.uid());

CREATE POLICY otp_codes_update_own
ON otp_codes FOR UPDATE TO authenticated
USING (user_auth_id = auth.uid())
WITH CHECK (user_auth_id = auth.uid());

CREATE POLICY otp_codes_delete_own
ON otp_codes FOR DELETE TO authenticated
USING (user_auth_id = auth.uid());