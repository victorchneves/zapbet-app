
import { createClient } from '@supabase/supabase-js';
import { syncFixtures } from '../_services/syncService.js';
import { generateDailyPicks } from '../_services/picksService.js';

export default async function handler(req, res) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiFootballKey = process.env.API_FOOTBALL_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !apiFootballKey) {
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    try {
        console.log(`[CRON] Starting daily update for ${today}`);

        // 1. Sync Fixtures
        const syncResult = await syncFixtures(today, supabase, apiFootballKey);

        // 2. Generate Picks
        const picksResult = await generateDailyPicks(today, supabase, apiFootballKey);

        res.status(200).json({
            success: true,
            date: today,
            sync: syncResult,
            picks: picksResult
        });
    } catch (error) {
        console.error('[CRON] Error:', error);
        res.status(500).json({ error: error.message });
    }
}
