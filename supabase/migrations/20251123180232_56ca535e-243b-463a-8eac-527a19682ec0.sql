-- Add prompt_frequency column with default 'daily'
ALTER TABLE users_app 
ADD COLUMN IF NOT EXISTS prompt_frequency TEXT DEFAULT 'daily';

-- Add check constraint for valid values
ALTER TABLE users_app 
ADD CONSTRAINT valid_prompt_frequency 
CHECK (prompt_frequency IN ('daily', 'weekdays', 'weekends', '3x', 'paused'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_app_prompt_frequency ON users_app(prompt_frequency);

-- Add comment for documentation
COMMENT ON COLUMN users_app.prompt_frequency IS 
'Controls prompt delivery frequency: daily, weekdays, weekends, 3x (Mon/Wed/Fri), paused';