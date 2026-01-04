-- 7. Transactions Log
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  external_id text not null, -- sale_id from Kirvano
  user_email text not null,
  user_id uuid references auth.users(id),
  amount numeric,
  status text, -- 'approved', 'refunded'
  provider text default 'kirvano',
  payload jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS (Admin Only mainly, but user can view own)
alter table public.transactions enable row level security;

create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);
  
-- Index for faster lookup
create index idx_transactions_external_id on public.transactions(external_id);
create index idx_transactions_email on public.transactions(user_email);
