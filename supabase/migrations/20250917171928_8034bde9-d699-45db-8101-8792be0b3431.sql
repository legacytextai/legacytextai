-- Add category field to journal_entries table
ALTER TABLE journal_entries ADD COLUMN category TEXT DEFAULT NULL;

-- Add index for better performance on category queries
CREATE INDEX idx_journal_entries_category ON journal_entries(category);

-- Add a comment to document the category field
COMMENT ON COLUMN journal_entries.category IS 'AI-generated category for journal entry content (e.g., Values, Advice, Memories, etc.)';