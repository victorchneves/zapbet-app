import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    try {
        console.log('Checking Premier League fixtures for 2026-01-03...\n');

        // Get ALL PL fixtures
        const { data: fixtures } = await supabase
            .from('fixtures')
            .select('id, league_id, home:teams!home_team_id(name), away:teams!away_team_id(name), date_utc')
            .eq('league_id', 39) // Premier League
            .gte('date_utc', '2026-01-03T00:00:00')
            .lte('date_utc', '2026-01-03T23:59:59')
            .in('status', ['NS', 'TBD']);

        if (!fixtures || fixtures.length === 0) {
            console.log('❌ NO Premier League fixtures found in DB for tomorrow!');
            console.log('Run sync first: /api/admin/sync?date=2026-01-03');
            return;
        }

        console.log(`Found ${fixtures.length} Premier League fixtures:\n`);

        for (const f of fixtures) {
            console.log(`${f.home.name} vs ${f.away.name} (ID: ${f.id})`);

            // Check odds
            const { data: oddsRecord } = await supabase.from('odds').select('*').eq('fixture_id', f.id).single();
            const hasOdds = oddsRecord && oddsRecord.payload && Object.keys(oddsRecord.payload).length > 0;

            // Check predictions
            const { data: predRecord } = await supabase.from('predictions').select('*').eq('fixture_id', f.id).single();
            const hasPreds = predRecord && predRecord.payload && Object.keys(predRecord.payload).length > 0;

            console.log(`  - Odds: ${hasOdds ? '✅' : '❌'}`);
            console.log(`  - Predictions: ${hasPreds ? '✅' : '❌'}`);

            if (hasPreds && predRecord.payload.predictions?.percent) {
                const p = predRecord.payload.predictions.percent;
                console.log(`    Home: ${p.home}, Draw: ${p.draw}, Away: ${p.away}`);
            }

            console.log('');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
