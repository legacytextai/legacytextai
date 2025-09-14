-- Single row per (user, phone), always — non-partial unique index
create unique index if not exists otp_codes_user_phone_unique
  on otp_codes (user_auth_id, new_phone_e164);

-- We no longer rely on the partial unique index; safe to drop if it exists
drop index if exists otp_codes_active_unique;

-- Ensure last_sent_at exists (from earlier patch), default it if missing
alter table otp_codes
  add column if not exists last_sent_at timestamptz;

update otp_codes
set last_sent_at = coalesce(last_sent_at, created_at)
where last_sent_at is null;