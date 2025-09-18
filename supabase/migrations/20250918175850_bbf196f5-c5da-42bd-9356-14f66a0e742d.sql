-- Security fixes for journal_entries table (Simple approach)

-- 1. Add foreign key constraint to ensure data integrity
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_journal_entries_user_id'
    ) THEN
        ALTER TABLE journal_entries 
        ADD CONSTRAINT fk_journal_entries_user_id 
        FOREIGN KEY (user_id) REFERENCES users_app(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create index for better performance on user lookups
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);

-- 3. Ensure user_id is never null (data integrity)
ALTER TABLE journal_entries 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop the redundant phone_e164 column safely
ALTER TABLE journal_entries DROP COLUMN IF EXISTS phone_e164;