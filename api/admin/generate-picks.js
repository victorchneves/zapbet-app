import { createClient } from '@supabase/supabase-js';
import { generateDailyPicks } from '../_services/picksService.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiFootballKey = process.env.API_FOOTBALL_KEY;

export default async function handler(request, response) {
    if (request.method !== 'POST' && request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { date } = request.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const result = await generateDailyPicks(targetDate, supabase, apiFootballKey);
        return response.status(200).json(result);
    } catch (error) {
        console.error('Error generating picks:', error);
        return response.status(500).json({ error: error.message });
    }
}
