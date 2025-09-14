-- Global tones catalog
create table if not exists tones (
  id bigserial primary key,
  key text not null unique,                    -- machine name, e.g., 'warm'
  label text not null,                         -- human-friendly
  weight int not null default 1 check (weight > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed defaults (idempotent)
insert into tones (key, label, weight, active) values
  ('warm',       'Warm and encouraging',          3, true),
  ('reflective', 'Reflective / meditative',       2, true),
  ('direct',     'Direct and concise',            1, true),
  ('gentle',     'Gentle and supportive',         2, true),
  ('playful',    'Light and playful',             1, true)
on conflict (key) do update set
  label = excluded.label,
  weight = excluded.weight,
  active = excluded.active;

create index if not exists tones_active_idx on tones (active);