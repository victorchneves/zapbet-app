-- Add market support to daily_picks
ALTER TABLE public.daily_picks 
ADD COLUMN IF NOT EXISTS market TEXT DEFAULT 'match_winner',
ADD COLUMN IF NOT EXISTS market_details JSONB;

-- Update check constraint to include new risk levels
ALTER TABLE public.daily_picks 
DROP CONSTRAINT IF EXISTS daily_picks_risk_level_check;

ALTER TABLE public.daily_picks
ADD CONSTRAINT daily_picks_risk_level_check 
CHECK (risk_level IN ('conservative', 'moderate', 'aggressive'));

-- Add comment for documentation
COMMENT ON COLUMN public.daily_picks.market IS 'Betting market type: match_winner, over_under, btts, etc.';
COMMENT ON COLUMN public.daily_picks.market_details IS 'Market-specific data: {"line": 2.5, "selection": "over"} for O/U, {"selection": "yes"} for BTTS';
