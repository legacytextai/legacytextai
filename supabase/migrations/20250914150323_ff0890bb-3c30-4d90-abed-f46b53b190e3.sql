-- Create users_app table (SMS journaling users)
create table if not exists users_app (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text unique not null,
  name text,
  status text default 'active' check (status in ('active', 'paused', 'opted_out')),
  created_at timestamptz default now()
);

-- Create prompts library table
create table if not exists prompts (
  id bigserial primary key,
  text text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Create message log table (all SMS in/out)
create table if not exists messages (
  id bigserial primary key,
  direction text not null check (direction in ('in','out')),
  phone_e164 text not null,
  body text not null,
  twilio_sid text unique,
  sent_at timestamptz default now()
);

-- Create journal entries table
create table if not exists journal_entries (
  id bigserial primary key,
  user_id uuid references users_app(id) on delete cascade,
  phone_e164 text not null,
  content text not null,
  source text default 'sms',
  message_sid text unique,
  received_at timestamptz default now()
);

-- Create daily prompts tracking table
create table if not exists daily_prompts (
  id bigserial primary key,
  user_id uuid references users_app(id) on delete cascade,
  prompt_id bigint references prompts(id),
  sent_at timestamptz default now(),
  sent_date date default current_date
);

-- Create indexes for performance
create index if not exists messages_phone_idx on messages (phone_e164);
create index if not exists journal_entries_user_idx on journal_entries (user_id);
create index if not exists journal_entries_phone_idx on journal_entries (phone_e164);
create index if not exists daily_prompts_user_date_idx on daily_prompts (user_id, sent_date);

-- Enable Row Level Security on new tables
alter table users_app enable row level security;
alter table prompts enable row level security;
alter table messages enable row level security;
alter table journal_entries enable row level security;
alter table daily_prompts enable row level security;

-- Insert sample prompts for the SMS journaling system
insert into prompts (text, active) values 
('What made you smile today? Share a moment of joy or pride with your child.', true),
('What lesson did you learn today that you want to pass on?', true),
('Describe a memory from your own childhood that you want your child to know about.', true),
('What are you most grateful for right now?', true),
('If you could give your child one piece of advice today, what would it be?', true),
('What family tradition or value is most important to you?', true),
('Tell me about a challenge you overcame and how it made you stronger.', true),
('What do you hope your child remembers most about you?', true)
on conflict do nothing;