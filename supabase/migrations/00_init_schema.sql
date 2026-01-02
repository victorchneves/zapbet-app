-- 1. Profiles Table (Extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  username text,
  full_name text,
  avatar_url text,
  subscription_status text default 'free',
  bankroll numeric default 0,
  risk_profile text default 'moderate',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. AI Threads Table
create table if not exists public.ai_threads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  openai_thread_id text, -- Added directly here to avoid migration 01 conflict
  messages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS for AI Threads
alter table public.ai_threads enable row level security;
create policy "Users can view own threads" on public.ai_threads
  for select using (auth.uid() = user_id);
create policy "Users can insert own threads" on public.ai_threads
  for insert with check (auth.uid() = user_id);
create policy "Users can update own threads" on public.ai_threads
  for update using (auth.uid() = user_id);

-- 3. Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on replay
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
