-- LEAGUES
create table if not exists public.leagues (
  id bigint primary key, -- External ID from API-Football
  name text not null,
  country text,
  season int,
  logo_url text,
  active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- TEAMS
create table if not exists public.teams (
  id bigint primary key, -- External ID
  name text not null,
  logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- FIXTURES
-- We drop and recreate fixtures to ensure foreign keys are correct if it was a basic table before
-- drop table if exists public.fixtures cascade; 
-- Commented out DROP to avoid data loss if you have data. Use IF NOT EXISTS + Alter if needed in future.
create table if not exists public.fixtures (
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

-- LINEUPS
create table if not exists public.lineups (
  fixture_id bigint references public.fixtures(id) primary key,
  confirmed boolean default false,
  payload jsonb, -- Full lineup JSON
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

-- EVENTS (Goals, Cards, etc)
create table if not exists public.events (
  fixture_id bigint references public.fixtures(id) primary key,
  payload jsonb, 
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

-- STATS
create table if not exists public.stats (
  fixture_id bigint references public.fixtures(id) primary key,
  payload jsonb, 
  last_fetched_at timestamp with time zone default timezone('utc'::text, now())
);

-- DAILY TOP GAMES
create table if not exists public.daily_top_games (
  date date primary key default current_date,
  fixture_ids jsonb not null, -- Array of IDs [123, 456]
  tags jsonb, -- Metadata { 123: "High Value", 456: "Derby" }
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- DAILY PICKS
create table if not exists public.daily_picks (
  id uuid default uuid_generate_v4() primary key,
  date date default current_date,
  fixture_id bigint references public.fixtures(id),
  risk_level text check (risk_level in ('conservative', 'moderate', 'aggressive')),
  title text not null,
  thesis text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
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
