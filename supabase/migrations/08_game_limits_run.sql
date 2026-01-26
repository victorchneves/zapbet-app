-- Track which fixtures a user has unlocked for deep analysis per day
create table if not exists public.daily_unlocked_fixtures (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date default current_date not null,
  fixture_id integer not null,
  created_at timestamp with time zone default now(),
  unique(user_id, date, fixture_id)
);

-- RLS
alter table public.daily_unlocked_fixtures enable row level security;

create policy "Users can read own unlocked fixtures" on public.daily_unlocked_fixtures
  for select using (auth.uid() = user_id);

-- We handle inserts via Service Role in the API, but if granular:
create policy "Users can insert own unlocked fixtures" on public.daily_unlocked_fixtures
  for insert with check (auth.uid() = user_id);

-- Index
create index if not exists idx_unlocked_fixtures_user_date 
  on public.daily_unlocked_fixtures(user_id, date);

comment on table public.daily_unlocked_fixtures is 'Tracks specific matches unlocked by free users (limit 1 per day)';
