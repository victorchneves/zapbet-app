
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPicks() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking picks for ${today}...`);

    const { data, error } = await supabase
        .from('daily_picks')
        .select('*')
        .eq('date', today);

    if (error) {
        console.error('Error fetching picks:', error);
        return;
    }

    console.log(`Found ${data.length} picks for today.`);
    if (data.length > 0) {
        console.log('Pick Sample:', data[0]);
    }
}

checkPicks();
