import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugFixtures() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Checking Fixtures for today: ${today}`);

    // 1. Get Fixtures
    const { data: fixtures, error } = await supabase
        .from('fixtures')
        .select(`
        id, 
        league_id, 
        status, 
        leagues(name), 
        home:teams!home_team_id(name), 
        away:teams!away_team_id(name)
    `)
        .gte('date_utc', today + 'T00:00:00')
        .lte('date_utc', today + 'T23:59:59');

    if (error) {
        console.error('❌ Error fetching fixtures:', error);
        return;
    }

    if (!fixtures || fixtures.length === 0) {
        console.log('❌ No fixtures found in DB for today.');
        return;
    }

    console.log(`✅ Found ${fixtures.length} fixtures.`);

    // 2. Check each fixture for Odds availability
    for (const f of fixtures) {
        const { data: hasOdds } = await supabase
            .from('odds')
            .select('id')
            .eq('fixture_id', f.id)
            .single();

        console.log(`- [${f.league_id}] ${f.home.name} vs ${f.away.name} (${f.status}) | League: ${f.leagues?.name} | Odds in DB? ${!!hasOdds}`);
    }
}

debugFixtures();
