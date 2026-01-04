import { createClient } from '@supabase/supabase-js';
import { generateDailyPicks } from './api/_services/picksService.js';
import { syncFixtures } from './api/_services/syncService.js';
// Keys passed via env vars


const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    try {
        const date = '2026-01-03';
        console.log(`Syncing fixtures for ${date} first...`);
        // We need API Key for sync
        const apiFootballKey = "5a87dee6bf5543f100b4b1eb3fc64c46"; // Hardcoded for test
        // await syncFixtures(date, supabase, apiFootballKey);

        console.log(`Testing picks for ${date}...`);
        const result = await generateDailyPicks(date, supabase, apiFootballKey);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
