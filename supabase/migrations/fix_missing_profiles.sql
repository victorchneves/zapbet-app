-- Backfill missing profiles for existing users
insert into public.profiles (id, email, full_name, avatar_url)
select 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    raw_user_meta_data->>'avatar_url'
from auth.users
where id not in (select id from public.profiles);

-- Verify the insertion
select count(*) from public.profiles;
