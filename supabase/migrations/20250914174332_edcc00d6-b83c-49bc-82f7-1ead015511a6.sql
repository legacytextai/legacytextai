-- Enable RLS on tones table and create policies
alter table tones enable row level security;

-- Allow reading active tones for everyone (needed for daily prompt generation)
create policy "Allow reading active tones"
  on tones for select
  using (active = true);

-- Only allow admin access for modifications (could be relaxed later)
create policy "Admin only modifications"
  on tones for all
  using (false)
  with check (false);