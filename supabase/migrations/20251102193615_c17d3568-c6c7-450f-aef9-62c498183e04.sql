-- Add columns to prompts table for handwritten prompt management
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS hash TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS batch_date DATE;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS prompts_hash_idx ON prompts(hash);
CREATE INDEX IF NOT EXISTS prompts_source_type_idx ON prompts(source_type);

-- Backfill existing prompts with hashes and metadata
UPDATE prompts 
SET 
  hash = encode(sha256(trim(text)::bytea), 'hex'),
  created_at = NOW(),
  source_type = 'system'
WHERE hash IS NULL;

-- Drop existing policy if it exists (to allow recreate)
DROP POLICY IF EXISTS "Service can insert handwritten prompts" ON prompts;

-- Add RLS policy for service role to insert handwritten prompts
CREATE POLICY "Service can insert handwritten prompts"
  ON prompts
  FOR INSERT
  TO service_role
  WITH CHECK (source_type = 'handwritten');