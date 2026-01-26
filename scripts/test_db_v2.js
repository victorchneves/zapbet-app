import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuerySplit() {
    console.log('Testing SPLIT Queries (Same as Frontend Fix)...');

    // 1. Get Unlocked
    const { data: unlocked, error: uError } = await supabase
        .from('daily_unlocked_fixtures')
        .select('fixture_id')
        .limit(1)
        .single();

    if (uError) {
        if (uError.code === 'PGRST116') {
            console.log('✅ Query 1 Success: No data found (Empty is OK)');
            return;
        }
        console.error('❌ Query 1 Failed:', uError);
        return;
    }

    console.log('✅ Query 1 Success:', unlocked);

    if (unlocked) {
        // 2. Get Fixture
        const { data: fixture, error: fError } = await supabase
            .from('fixtures')
            .select('home:teams!home_team_id(name), away:teams!away_team_id(name)')
            .eq('id', unlocked.fixture_id)
            .single();

        if (fError) {
            console.error('❌ Query 2 Failed:', fError);
        } else {
            console.log('✅ Query 2 Success:', fixture);
        }
    }
}
testQuerySplit();
