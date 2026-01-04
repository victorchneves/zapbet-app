import { createClient } from '@supabase/supabase-js';
import { generateDailyPicks } from './api/_services/picksService.js';

const supabaseUrl = "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";
const apiFootballKey = "5a87dee6bf5543f100b4b1eb3fc64c46";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    try {
        const date = '2026-01-03';
        console.log(`Generating Daily Picks for ${date}...\n`);

        const result = await generateDailyPicks(date, supabase, apiFootballKey);

        console.log('\n========== RESULT ==========');
        console.log(JSON.stringify(result, null, 2));
        console.log('============================\n');

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
