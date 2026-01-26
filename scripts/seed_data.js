import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedData() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🌱 Seeding Data for ${today}...`);

    // 1. Get Fixtures
    const { data: fixtures } = await supabase
        .from('fixtures')
        .select('id, home:teams!home_team_id(name), away:teams!away_team_id(name)')
        .gte('date_utc', today + 'T00:00:00')
        .lte('date_utc', today + 'T23:59:59');

    if (!fixtures || fixtures.length === 0) {
        console.log('No fixtures found to seed.');
        return;
    }

    console.log(`Found ${fixtures.length} fixtures.`);

    const mockOdds = [
        {
            id: 1,
            name: 'Match Winner',
            values: [
                { value: 'Home', odd: '2.10' },
                { value: 'Draw', odd: '3.20' },
                { value: 'Away', odd: '2.90' }
            ]
        },
        {
            id: 5,
            name: 'Goals Over/Under',
            values: [
                { value: 'Over 2.5', odd: '1.85' },
                { value: 'Under 2.5', odd: '1.95' }
            ]
        },
        {
            id: 8,
            name: 'Both Teams Score',
            values: [
                { value: 'Yes', odd: '1.75' },
                { value: 'No', odd: '2.05' }
            ]
        }
    ];

    const mockPredictions = {
        predictions: {
            winner: { name: 'Home Team', comment: 'Win or Draw' },
            win_or_draw: true,
            under_over: 'Over 2.5',
            goals: { home: '1.5', away: '0.8' },
            advice: 'Double Chance : Home or Draw',
            percent: { home: '45%', draw: '30%', away: '25%' }
        }
    };

    for (const f of fixtures) {
        // 2. Mock Odds
        const oddPayload = JSON.parse(JSON.stringify(mockOdds));
        // Randomize slightly
        const homeOdd = (1.4 + Math.random()).toFixed(2);
        const awayOdd = (2.8 + Math.random()).toFixed(2);
        oddPayload[0].values[0].odd = homeOdd;
        oddPayload[0].values[2].odd = awayOdd;

        await supabase.from('odds').upsert({
            fixture_id: f.id,
            payload: oddPayload,
            update_time: new Date().toISOString()
        });

        // 3. Mock Predictions
        const predPayload = JSON.parse(JSON.stringify(mockPredictions));
        // Adjust percent based on odds
        const homeProb = (1 / parseFloat(homeOdd) * 100).toFixed(0) + '%';
        const awayProb = (1 / parseFloat(awayOdd) * 100).toFixed(0) + '%';
        predPayload.predictions.percent.home = homeProb;
        predPayload.predictions.percent.away = awayProb;

        await supabase.from('predictions').upsert({
            fixture_id: f.id,
            payload: predPayload,
            update_time: new Date().toISOString()
        });

        console.log(`✅ Seeded Odds & Preds for ${f.home.name} vs ${f.away.name}`);
    }
}

seedData();
