-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles Table (Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  bankroll numeric default 0,
  risk_profile text check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  subscription_status text default 'trial' check (subscription_status in ('trial', 'active', 'blocked')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Leagues Table
create table public.leagues (
  id bigint primary key,
  name text not null,
  country text,
  logo text,
  active boolean default true
);

alter table public.leagues enable row level security;
create policy "Anyone can view leagues" on public.leagues for select using (true);

-- Fixtures Table (Games)
create table public.fixtures (
  id bigint primary key,
  league_id bigint references public.leagues(id),
  home_team text not null,
  away_team text not null,
  start_time timestamp with time zone not null,
  status text, -- 'NS' (Not Started), 'LIVE', 'FT' (Full Time)
  home_score int,
  away_score int,
  data jsonb, -- External API dump for flexible querying
  tags text[], -- e.g., ['high_volatility', 'favorite_losing']
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.fixtures enable row level security;
create policy "Anyone can view fixtures" on public.fixtures for select using (true);

-- Daily Top Games (Curated)
create table public.daily_top_games (
  id uuid default uuid_generate_v4() primary key,
  fixture_id bigint references public.fixtures(id),
  analysis_summary text,
  ai_confidence int,
  date date default current_date
);

alter table public.daily_top_games enable row level security;
create policy "Anyone can view top games" on public.daily_top_games for select using (true);

-- Daily Picks (Hooks)
create table public.daily_picks (
  id uuid default uuid_generate_v4() primary key,
  fixture_id bigint references public.fixtures(id),
  title text not null,
  thesis text,
  risk text check (risk in ('low', 'medium', 'high', 'bingo')),
  status text default 'open', -- 'open', 'won', 'lost'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.daily_picks enable row level security;
create policy "Anyone can view picks" on public.daily_picks for select using (true);

-- AI Threads (Chat History)
create table public.ai_threads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  messages jsonb default '[]'::jsonb, -- Array of {role: 'user'|'assistant', content: string}
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.ai_threads enable row level security;

create policy "Users can view own threads" on public.ai_threads
  for select using (auth.uid() = user_id);

create policy "Users can insert own threads" on public.ai_threads
  for insert with check (auth.uid() = user_id);

create policy "Users can update own threads" on public.ai_threads
  for update using (auth.uid() = user_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
