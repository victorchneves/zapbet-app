import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    try {
        // 1. Get ONE fixture for tomorrow
        const { data: fixtures } = await supabase
            .from('fixtures')
            .select('id, home:teams!home_team_id(name), away:teams!away_team_id(name)')
            .gte('date_utc', '2026-01-03T00:00:00')
            .lte('date_utc', '2026-01-03T23:59:59')
            .in('status', ['NS', 'TBD'])
            .limit(1);

        if (!fixtures || fixtures.length === 0) {
            console.log('No fixtures found for 2026-01-03');
            return;
        }

        const fixture = fixtures[0];
        console.log(`\nTesting with: ${fixture.home.name} vs ${fixture.away.name} (ID: ${fixture.id})\n`);

        // 2. Get Odds
        const { data: oddsRecord } = await supabase.from('odds').select('*').eq('fixture_id', fixture.id).single();
        console.log('Odds Record:', JSON.stringify(oddsRecord, null, 2));

        // 3. Get Predictions
        const { data: predRecord } = await supabase.from('predictions').select('*').eq('fixture_id', fixture.id).single();
        console.log('Predictions Record:', JSON.stringify(predRecord, null, 2));

        // 4. Parse and Score
        if (!oddsRecord?.payload || !predRecord?.payload) {
            console.log('\n⚠️ Missing odds or predictions data.');
            return;
        }

        const matchWinner = oddsRecord.payload.find(m => m.name === 'Match Winner');
        if (!matchWinner) {
            console.log('\n⚠️ No "Match Winner" odds found.');
            return;
        }

        const homeOdd = parseFloat(matchWinner.values.find(v => v.value === 'Home')?.odd || 0);
        const awayOdd = parseFloat(matchWinner.values.find(v => v.value === 'Away')?.odd || 0);

        const predictions = predRecord.payload.predictions || {};
        const percent = predictions.percent || {};
        const homeProb = parseFloat(percent.home?.replace('%', '') || 0) / 100;
        const awayProb = parseFloat(percent.away?.replace('%', '') || 0) / 100;

        console.log(`\n📊 Parsed Data:`);
        console.log(`Home Odd: ${homeOdd}, Prob: ${(homeProb * 100).toFixed(0)}%`);
        console.log(`Away Odd: ${awayOdd}, Prob: ${(awayProb * 100).toFixed(0)}%`);

        const favorite = homeProb > awayProb ? 'home' : 'away';
        const winProb = homeProb > awayProb ? homeProb : awayProb;
        const oddValue = homeProb > awayProb ? homeOdd : awayOdd;

        console.log(`\n🎯 Favorite: ${favorite.toUpperCase()} (${(winProb * 100).toFixed(0)}%) @ ${oddValue}`);

        // Check buckets
        if (winProb >= 0.72 && oddValue >= 1.40 && oddValue <= 1.85) {
            console.log('✅ CONSERVATIVE pick!');
        } else if (winProb >= 0.62 && winProb < 0.72 && oddValue >= 1.70 && oddValue <= 2.20) {
            console.log('✅ MODERATE pick!');
        } else if (winProb >= 0.55 && oddValue >= 2.20 && oddValue <= 3.00) {
            console.log('✅ AGGRESSIVE pick!');
        } else {
            console.log(`❌ Does NOT qualify. Prob: ${(winProb * 100).toFixed(0)}%, Odd: ${oddValue}`);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
