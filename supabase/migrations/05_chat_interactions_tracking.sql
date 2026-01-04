-- Add chat interaction tracking for daily limits
create table if not exists public.chat_interactions_daily (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date default current_date,
  interaction_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, date)
);

-- RLS
alter table public.chat_interactions_daily enable row level security;

create policy "Users can read own interactions" on public.chat_interactions_daily
  for select using (auth.uid() = user_id);

create policy "Users can insert own interactions" on public.chat_interactions_daily
  for insert with check (auth.uid() = user_id);

create policy "Users can update own interactions" on public.chat_interactions_daily
  for update using (auth.uid() = user_id);

-- Index for performance
create index if not exists idx_chat_interactions_user_date 
  on public.chat_interactions_daily(user_id, date);

-- Comment
comment on table public.chat_interactions_daily is 'Tracks daily chat interactions for free tier limits (3/day)';
