import { createClient } from '@supabase/supabase-js';
import { syncFixtures } from '../_services/syncService.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiFootballKey = process.env.API_FOOTBALL_KEY;

export default async function handler(request, response) {
    if (!apiFootballKey) {
        return response.status(500).json({ error: 'Missing API_FOOTBALL_KEY' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get date from query param OR default to today
    const { date } = request.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
        const result = await syncFixtures(targetDate, supabase, apiFootballKey);

        // Log for manual debugging
        if (result.fixtures && result.fixtures.length > 0) {
            console.log('\n======================================================');
            console.log(`[SYNC] IDs PARA TESTE (${targetDate}):`);
            result.fixtures.slice(0, 5).forEach(f => {
                console.log(`- ID: ${f.id} | ${f.home} vs ${f.away}`);
            });
            console.log('======================================================\n');
        }

        return response.status(200).json(result);

    } catch (error) {
        console.error('Sync Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
