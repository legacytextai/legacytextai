-- Security fixes for journal_entries table (Corrected)

-- 1. Add foreign key constraint to ensure data integrity
ALTER TABLE journal_entries 
ADD CONSTRAINT fk_journal_entries_user_id 
FOREIGN KEY (user_id) REFERENCES users_app(id) ON DELETE CASCADE;

-- 2. Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);

-- 3. First create a backup view BEFORE dropping the column
CREATE OR REPLACE VIEW journal_entries_backup AS
SELECT 
  je.id,
  je.user_id,
  je.received_at,
  je.category,
  je.name,
  je.message_sid,
  je.content,
  je.source,
  je.phone_e164,
  ua.phone_e164 as user_phone_e164,
  ua.name as user_name
FROM journal_entries je
LEFT JOIN users_app ua ON je.user_id = ua.id;

-- 4. Now safely drop the redundant phone_e164 column
ALTER TABLE journal_entries DROP COLUMN phone_e164;

-- 5. Ensure user_id is never null (data integrity)
ALTER TABLE journal_entries 
ALTER COLUMN user_id SET NOT NULL;