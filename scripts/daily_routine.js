import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { syncFixtures } from '../api/_services/syncService.js';
import { generateDailyPicks } from '../api/_services/picksService.js';

// Load Env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiFootballKey = process.env.API_FOOTBALL_KEY;

if (!supabaseUrl || !supabaseServiceKey || !apiFootballKey) {
    console.error('❌ Missing environment variables. Make sure .env is present.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    // Get date from args or default to today
    const dateArg = process.argv[2];
    const targetDate = dateArg || new Date().toISOString().split('T')[0];

    console.log(`\n🚀 RUNNING DAILY UPDATE FOR: ${targetDate}`);
    console.log('================================================');

    try {
        // 1. Sync
        console.log('\n📡 STEP 1: Syncing Fixtures...');
        const syncResult = await syncFixtures(targetDate, supabase, apiFootballKey);
        console.log(`✅ Sync Done. Processed: ${syncResult.processed}`);

        if (syncResult.fixtures.length > 0) {
            console.log('Sample Fixtures:', syncResult.fixtures.slice(0, 3));
        } else {
            console.warn('⚠️ No fixtures found for this date (check league filters).');
        }

        // 2. Picks
        console.log('\n🧠 STEP 2: Generating Picks...');
        const picksResult = await generateDailyPicks(targetDate, supabase, apiFootballKey);
        console.log(`✅ Picks Done. Generated: ${picksResult.count || 0}`);

        console.log('\n================================================');
        console.log('🎉 DAILY ROUTINE FINISHED SUCCESSFULLY');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error);
        process.exit(1);
    }
}

run();
