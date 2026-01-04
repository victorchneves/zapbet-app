import { createClient } from '@supabase/supabase-js';
import { syncFixtures } from '../_services/syncService.js';
import { generateDailyPicks } from '../_services/picksService.js';

export default async function handler(request, response) {
    const { action, date } = request.query;

    // Auth Check (Basic - could be improved with Admin Secret if needed)
    // For now assuming Vercel protection or basic obscurity

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiFootballKey = process.env.API_FOOTBALL_KEY;

    if (!supabaseServiceKey || !apiFootballKey) {
        return response.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        if (action === 'sync') {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const result = await syncFixtures(targetDate, supabase, apiFootballKey);
            return response.status(200).json(result);
        }
        else if (action === 'generate-picks') {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const result = await generateDailyPicks(targetDate, supabase);
            return response.status(200).json(result);
        }
        else {
            return response.status(400).json({ error: 'Invalid action. Use ?action=sync or ?action=generate-picks' });
        }
    } catch (error) {
        console.error(`Error in admin action ${action}:`, error);
        return response.status(500).json({ error: error.message });
    }
}
