-- Update the handle_new_user trigger to check for existing transactions
create or replace function public.handle_new_user()
returns trigger as $$
declare
  existing_sale record;
begin
  -- 1. Create Profile first (default free)
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- 2. Check for "Orphan" purchases (email matches, but user_id was null)
  select * into existing_sale 
  from public.transactions 
  where user_email = new.email 
    and status = 'approved' 
    and user_id is null
  limit 1;

  -- 3. If found, upgrade user and link transaction
  if existing_sale is not null then
    -- Upgrade Profile
    update public.profiles
    set subscription_status = 'premium'
    where id = new.id;

    -- Link Transaction
    update public.transactions
    set user_id = new.id
    where user_email = new.email;
  end if;

  return new;
end;
$$ language plpgsql security definer;
