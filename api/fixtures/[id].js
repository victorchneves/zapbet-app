import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = request.query;
    if (!id) return response.status(400).json({ error: 'Missing Fixture ID' });

    const authHeader = request.headers.authorization;
    if (!authHeader) return response.status(401).json({ error: 'Unauthorized' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Parallel fetch for speed
        const [fixtureRes, lineupsRes, eventsRes, statsRes] = await Promise.all([
            supabase.from('fixtures').select(`*, leagues(*), home:teams!home_team_id(*), away:teams!away_team_id(*)`).eq('id', id).single(),
            supabase.from('lineups').select('*').eq('fixture_id', id).single(),
            supabase.from('events').select('*').eq('fixture_id', id).single(),
            supabase.from('stats').select('*').eq('fixture_id', id).single()
        ]);

        if (fixtureRes.error) throw fixtureRes.error;

        return response.status(200).json({
            fixture: fixtureRes.data,
            lineups: lineupsRes.data,
            events: eventsRes.data,
            stats: statsRes.data
        });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
