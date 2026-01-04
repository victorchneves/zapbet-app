-- Add featured columns to daily_picks
ALTER TABLE public.daily_picks 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_analysis JSONB DEFAULT NULL;

-- Index for fast lookup of featured picks
CREATE INDEX IF NOT EXISTS idx_daily_picks_featured ON public.daily_picks(date, is_featured);

COMMENT ON COLUMN public.daily_picks.is_featured IS 'True if this is the main featured pick of the day';
COMMENT ON COLUMN public.daily_picks.featured_analysis IS 'Structured analysis for the featured pick (competition, match, market, etc)';
