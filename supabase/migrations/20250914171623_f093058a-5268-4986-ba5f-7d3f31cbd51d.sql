-- Personalization fields on users_app
alter table users_app
  add column if not exists preferred_language text default 'en',        -- ISO code, e.g., 'en', 'es'
  add column if not exists timezone text default 'America/Los_Angeles',
  add column if not exists tone text default 'warm',                    -- 'warm', 'direct', etc.
  add column if not exists interests text[] default '{}',               -- e.g., {'parenting','sports'}
  add column if not exists banned_topics text[] default '{}',           -- e.g., {'grief','finances'}
  add column if not exists children jsonb default '[]';                 -- [{ "name":"Ava", "age":6 }]

-- Enrich daily_prompts for AI auditing
alter table daily_prompts
  add column if not exists prompt_text text,
  add column if not exists prompt_hash text,
  add column if not exists prompt_language text,
  add column if not exists is_ai boolean default false,
  add column if not exists model text,
  add column if not exists is_forced boolean default false,
  add column if not exists source text default 'schedule',
  add column if not exists sent_date date
    generated always as ((timezone('utc', sent_at))::date) stored;

-- Clean up duplicates first by keeping only the latest entry per user per day
WITH ranked_prompts AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, (timezone('utc', sent_at))::date ORDER BY sent_at DESC) as rn
  FROM daily_prompts
)
DELETE FROM daily_prompts 
WHERE id IN (
  SELECT id FROM ranked_prompts WHERE rn > 1
);

-- Add the index for hash lookups
create index if not exists daily_prompts_user_hash on daily_prompts (user_id, prompt_hash);

-- Add unique constraint to prevent future duplicates (only for non-forced sends)
create unique index if not exists daily_prompts_one_per_day_sched
  on daily_prompts (user_id, sent_date)
  where is_forced = false;