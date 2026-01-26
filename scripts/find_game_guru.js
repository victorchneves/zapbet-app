
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findMatch() {
    console.log('Searching for Everton vs Leeds...');

    // 1. Find Team IDs
    const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .or('name.ilike.%Everton%,name.ilike.%Leeds%');

    console.log('Found Teams:', teams);

    if (!teams || teams.length < 2) {
        console.log('Could not find both teams.');
        return;
    }

    const ids = teams.map(t => t.id);

    // 2. Search Fixtures
    const { data: fixtures, error } = await supabase
        .from('fixtures')
        .select(`
        id, 
        date_utc, 
        status,
        leagues (name, id), 
        home:teams!home_team_id (name), 
        away:teams!away_team_id (name)
    `)
        .or(`home_team_id.in.(${ids.join(',')}),away_team_id.in.(${ids.join(',')})`)
        .order('date_utc', { ascending: false })
        .limit(10);

    if (error) console.error(error);

    if (fixtures && fixtures.length > 0) {
        console.log('Found latest matches:', JSON.stringify(fixtures, null, 2));

        // Check odds for the latest one
        const latest = fixtures[0];
        const { data: odds } = await supabase.from('odds').select('*').eq('fixture_id', latest.id);
        console.log(`Odds for ID ${latest.id}:`, odds ? odds.length : 0);
    } else {
        console.log('No direct matches found in fixtures table.');
    }
}

findMatch();
