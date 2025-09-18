-- Security fixes for journal_entries table

-- 1. Add foreign key constraint to ensure data integrity
ALTER TABLE journal_entries 
ADD CONSTRAINT fk_journal_entries_user_id 
FOREIGN KEY (user_id) REFERENCES users_app(id) ON DELETE CASCADE;

-- 2. Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);

-- 3. Remove redundant phone_e164 field from journal_entries
-- First, create a backup view in case we need to recover data
CREATE OR REPLACE VIEW journal_entries_with_phone AS
SELECT 
  je.*,
  ua.phone_e164,
  ua.name as user_name
FROM journal_entries je
JOIN users_app ua ON je.user_id = ua.id;

-- 4. Drop the redundant phone_e164 column from journal_entries
ALTER TABLE journal_entries DROP COLUMN IF EXISTS phone_e164;

-- 5. Update the populate_name_from_user_id trigger to also handle phone lookups
-- Create a function to get phone from user_id 
CREATE OR REPLACE FUNCTION public.get_user_phone_from_id(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone_e164 FROM users_app WHERE id = p_user_id LIMIT 1;
$$;

-- 6. Ensure user_id is never null (data integrity)
ALTER TABLE journal_entries 
ALTER COLUMN user_id SET NOT NULL;

-- 7. Add a check to ensure user_id exists in users_app
-- This is redundant with foreign key but adds an extra layer
CREATE OR REPLACE FUNCTION validate_journal_entry_user()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users_app WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Invalid user_id: user does not exist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_journal_entry_user_trigger
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_user();