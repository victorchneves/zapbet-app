-- Fix missing foreign key for daily_unlocked_fixtures to allow joined queries
ALTER TABLE public.daily_unlocked_fixtures
DROP CONSTRAINT IF EXISTS daily_unlocked_fixtures_fixture_id_fkey; -- drop if exists (defensive)

ALTER TABLE public.daily_unlocked_fixtures
ADD CONSTRAINT daily_unlocked_fixtures_fixture_id_fkey
FOREIGN KEY (fixture_id)
REFERENCES public.fixtures(id)
ON DELETE CASCADE;

-- Also verify the transaction table has the correct status constraint if needed, but it seems fine.
