-- Track last time we actually sent an OTP
ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

-- Initialize missing last_sent_at from created_at
UPDATE otp_codes SET last_sent_at = COALESCE(last_sent_at, created_at) WHERE last_sent_at IS NULL;