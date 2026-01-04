import { createClient } from '@supabase/supabase-js';
import { syncFixtures } from '../_services/syncService.js';
import { generateDailyPicks } from '../_services/picksService.js';

export default async function handler(request, response) {
    // Basic Auth for Cron (optional but recommended)
    // const authHeader = request.headers.authorization;
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiFootballKey = process.env.API_FOOTBALL_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !apiFootballKey) {
        return response.status(500).json({ error: 'Missing environment variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date or default to today
    const { date } = request.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
        console.log(`\n=== 🔄 STARTING DAILY ROUTINE FOR ${targetDate} ===`);

        // 1. Sync Fixtures (Fetch from API-Football -> Supabase)
        console.log('--- Step 1: Syncing Fixtures ---');
        const syncResult = await syncFixtures(targetDate, supabase, apiFootballKey);
        console.log(`✅ Sync Complete: ${syncResult.processed} fixtures processed.`);

        // 2. Generate Picks (Analyze Fixtures -> create Daily Picks)
        console.log('--- Step 2: Generating Picks ---');
        const picksResult = await generateDailyPicks(targetDate, supabase, apiFootballKey);
        console.log(`✅ Picks Generation Complete: ${picksResult.count || 0} picks created.`);

        // 3. Trigger Push Notification (If picks generated)
        let pushResult = { status: 'skipped' };
        if (picksResult.count > 0) {
            console.log('--- Step 3: Triggering Push Notification ---');
            // We can fetch our own endpoint
            const protocol = request.headers['x-forwarded-proto'] || 'http';
            const host = request.headers.host;
            try {
                const pushRes = await fetch(`${protocol}://${host}/api/cron/trigger_push?date=${targetDate}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
                });
                pushResult = await pushRes.json();
                console.log('✅ Push Triggered:', pushResult);
            } catch (e) {
                console.error('⚠️ Push Trigger Failed:', e.message);
                pushResult = { error: e.message };
            }
        }

        // 4. Return Summary
        return response.status(200).json({
            success: true,
            date: targetDate,
            sync: syncResult,
            picks: picksResult,
            push: pushResult,
            message: `Routine finished. Synced ${syncResult.processed} games, Generated ${picksResult.count || 0} picks.`
        });

    } catch (error) {
        console.error('❌ Daily Routine Error:', error);
        return response.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
