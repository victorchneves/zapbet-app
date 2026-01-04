import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LEAGUES = {
    39: 'Premier League',
    140: 'La Liga',
    135: 'Serie A',
    78: 'Bundesliga',
    61: 'Ligue 1'
};

async function run() {
    try {
        console.log('Checking ALL Top Leagues for 2026-01-03...\n');

        let totalWithData = 0;

        for (const [leagueId, leagueName] of Object.entries(LEAGUES)) {
            const { data: fixtures } = await supabase
                .from('fixtures')
                .select('id, home:teams!home_team_id(name), away:teams!away_team_id(name)')
                .eq('league_id', parseInt(leagueId))
                .gte('date_utc', '2026-01-03T00:00:00')
                .lte('date_utc', '2026-01-03T23:59:59')
                .in('status', ['NS', 'TBD']);

            if (!fixtures || fixtures.length === 0) {
                console.log(`❌ ${leagueName}: No fixtures found\n`);
                continue;
            }

            console.log(`\n🏆 ${leagueName.toUpperCase()} (${fixtures.length} games):`);
            console.log('─'.repeat(60));

            let withData = 0;

            for (const f of fixtures) {
                const { data: oddsRecord } = await supabase.from('odds').select('*').eq('fixture_id', f.id).single();
                const { data: predRecord } = await supabase.from('predictions').select('*').eq('fixture_id', f.id).single();

                const hasOdds = oddsRecord?.payload && Object.keys(oddsRecord.payload).length > 0;
                const hasPreds = predRecord?.payload && Object.keys(predRecord.payload).length > 0;

                if (hasOdds && hasPreds) {
                    withData++;
                    const p = predRecord.payload.predictions?.percent || {};
                    console.log(`✅ ${f.home.name} vs ${f.away.name}`);
                    console.log(`   Prob: Home ${p.home}, Draw ${p.draw}, Away ${p.away}`);
                } else {
                    console.log(`❌ ${f.home.name} vs ${f.away.name} (missing data)`);
                }
            }

            totalWithData += withData;
            console.log(`\nSummary: ${withData}/${fixtures.length} games with complete data\n`);
        }

        console.log('═'.repeat(60));
        console.log(`\n🎯 TOTAL GAMES WITH DATA: ${totalWithData}\n`);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
