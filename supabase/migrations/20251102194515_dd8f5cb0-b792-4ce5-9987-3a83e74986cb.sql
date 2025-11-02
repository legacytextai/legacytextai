-- Temporarily disable the trigger if there's a constraint
-- Step 1: Move all IDs to negative range to avoid conflicts
WITH ordered_prompts AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) as new_id
  FROM prompts
)
UPDATE prompts 
SET id = -ordered_prompts.new_id
FROM ordered_prompts
WHERE prompts.id = ordered_prompts.id;

-- Step 2: Convert negative IDs to positive sequential IDs (1-65)
UPDATE prompts 
SET id = -id
WHERE id < 0;

-- Step 3: Reset the sequence to start from 66 (next available ID)
SELECT setval('prompts_id_seq', 66, false);