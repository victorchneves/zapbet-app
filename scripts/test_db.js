import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
    console.log('Testing Unlocked Fixtures Query...');
    const { data, error } = await supabase
        .from('daily_unlocked_fixtures')
        .select('fixture_id, fixtures(home:teams!home_team_id(name), away:teams!away_team_id(name))')
        .limit(1);

    if (error) {
        console.error('❌ Query Failed:', error);
    } else {
        console.log('✅ Query Success:', JSON.stringify(data, null, 2));
    }
}
testQuery();
