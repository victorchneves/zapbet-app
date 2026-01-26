
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://wcjxeiohfvqjouxscozj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjanhlaW9oZnZxam91eHNjb3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njc4NzQzMiwiZXhwIjoyMDgyMzYzNDMyfQ.gJ2ZaZ3Up88qNPWolJZN26hpXRG-mG2_yNF78zloS7w";

async function check() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0]; // 2026-01-26

    console.log(`Checking fixtures for date (UTC): ${today}`);

    const { count, error } = await supabase
        .from('fixtures')
        .select('*', { count: 'exact', head: true })
        .gte('date_utc', `${today}T00:00:00`)
        .lte('date_utc', `${today}T23:59:59`);

    if (error) {
        console.error('Error fetching fixtures:', error);
    } else {
        console.log(`Found ${count} fixtures for today.`);
    }
}

check();
