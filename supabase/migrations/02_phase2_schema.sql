-- LEAGUES
create table public.leagues (
  id bigint primary key, -- External ID from API-Football
  name text not null,
  country text,
  season int,
  logo_url text,
  active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.leagues enable row level security;
create policy "Public read leagues" on public.leagues for select using (auth.role() = 'authenticated');

-- TEAMS
create table public.teams (
  id bigint primary key, -- External ID
  name text not null,
  logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.teams enable row level security;
create policy "Public read teams" on public.teams for select using (auth.role() = 'authenticated');

-- FIXTURES (Replacing/Upgrading existing fixtures table if exists, or creating new)
-- Note: We previously defined a simple 'fixtures' table in schema.sql. 
-- We will Drop and Recreate to match strict Phase 2 requirements or Alter it.
-- For safety in this context, let's assume we are migrating or extending.
-- Since the previous one was basic cache, I'll drop and recreate to match the exact specs.

drop table if exists public.fixtures cascade;

create table public.fixtures (
  id bigint primary key, -- External ID
  league_id bigint references public.leagues(id),
  season int,
  date_utc timestamp with time zone not null,
  status text, -- 'NS', 'LIVE', 'FT', etc
  home_team_id bigint references public.teams(id),
  away_team_id bigint references public.teams(id),
  venue text,
  referee text,
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.fixtures enable row level security;
create policy "Public read fixtures" on public.fixtures for select using (auth.role() = 'authenticated');

-- LINEUPS
create table public.lineups (
  fixture_id bigint references public.fixtures(id) primary key,
  confirmed boolean default false,
  payload jsonb, -- Full lineup JSON
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.lineups enable row level security;
create policy "Public read lineups" on public.lineups for select using (auth.role() = 'authenticated');

-- EVENTS (Goals, Cards, etc)
create table public.events (
  fixture_id bigint references public.fixtures(id) primary key,
  payload jsonb, 
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.events enable row level security;
create policy "Public read events" on public.events for select using (auth.role() = 'authenticated');

-- STATS
create table public.stats (
  fixture_id bigint references public.fixtures(id) primary key,
  payload jsonb, 
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.stats enable row level security;
create policy "Public read stats" on public.stats for select using (auth.role() = 'authenticated');

-- DAILY TOP GAMES
create table public.daily_top_games (
  date date primary key default current_date,
  fixture_ids jsonb not null, -- Array of IDs [123, 456]
  tags jsonb, -- Metadata { 123: "High Value", 456: "Derby" }
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.daily_top_games enable row level security;
create policy "Public read top games" on public.daily_top_games for select using (auth.role() = 'authenticated');

-- DAILY PICKS
create table public.daily_picks (
  id uuid default uuid_generate_v4() primary key,
  date date default current_date,
  fixture_id bigint references public.fixtures(id),
  risk_level text check (risk_level in ('conservative', 'moderate', 'aggressive')),
  title text not null,
  thesis text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.daily_picks enable row level security;
create policy "Public read picks" on public.daily_picks for select using (auth.role() = 'authenticated');

-- PUSH SUBSCRIPTIONS
create table public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  subscription jsonb not null, -- The VAPID subscription object
  enabled boolean default true,
  prefs jsonb default '{"picks": true, "live": true, "leagues": []}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.push_subscriptions enable row level security;
create policy "Users manage own subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- SERVICE ROLE POLICIES (Implicitly enabled if RLS is on, but explicitly good document)
-- Note: Service Role bypasses RLS, so no specific policy needed for n8n/admin/backend if using service key.
