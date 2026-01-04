-- Create Odds Table
CREATE TABLE IF NOT EXISTS odds (
    fixture_id BIGINT PRIMARY KEY REFERENCES fixtures(id) ON DELETE CASCADE,
    payload JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    fixture_id BIGINT PRIMARY KEY REFERENCES fixtures(id) ON DELETE CASCADE,
    payload JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Standings Table
-- Composite Primary Key because a league has different standings per season
CREATE TABLE IF NOT EXISTS standings (
    league_id BIGINT REFERENCES leagues(id) ON DELETE CASCADE,
    season INTEGER NOT NULL,
    payload JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (league_id, season)
);

-- Enable RLS (read-only for public, write for service role/admin)
ALTER TABLE odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read odds" ON odds FOR SELECT USING (true);
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read standings" ON standings FOR SELECT USING (true);

-- Functions to auto-update 'updated_at' (if re-using existing trigger, fine. If not, create generic one)
-- Assuming 'handle_updated_at' exists from previous migrations. If doubtful, we can check or create inline.
-- Let's create a specific trigger for these just to be safe and self-contained or use the existing one if we knew it existed.
-- Given previous logs, I didn't see a generic trigger. I'll add a simple one or just rely on Upsert setting it.
-- Actually, for upsert updates, it's safer to have a trigger.

CREATE OR REPLACE FUNCTION update_extended_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_odds_timestamp BEFORE UPDATE ON odds
    FOR EACH ROW EXECUTE FUNCTION update_extended_data_timestamp();

CREATE TRIGGER update_predictions_timestamp BEFORE UPDATE ON predictions
    FOR EACH ROW EXECUTE FUNCTION update_extended_data_timestamp();

CREATE TRIGGER update_standings_timestamp BEFORE UPDATE ON standings
    FOR EACH ROW EXECUTE FUNCTION update_extended_data_timestamp();
