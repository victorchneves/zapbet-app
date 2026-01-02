import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // Validate Auth usually required, but for MVP optimization we can allow public read if cached or standard auth
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Verify token
    // const token = authHeader.split(' ')[1];
    // const { data: { user }, error } = await supabase.auth.getUser(token);
    // if (error) return response.status(401).json({ error: 'Invalid Token' });

    try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch fixtures for today from cache
        const { data: fixtures, error } = await supabase
            .from('fixtures')
            .select('*, leagues(name, logo_url, country), home_team_id, away_team_id')
            .eq('date_utc::date', today)
            .order('date_utc', { ascending: true });

        if (error) throw error;

        // Enhance with team names (manual join if foreign keys are tricky with 'select' syntax or just use raw SDK power)
        // Actually Supabase select references work if relation is defined.
        // We need to fetch team names. Let's do a join.
        // .select('*, leagues(name), home:teams!home_team_id(name, logo_url), away:teams!away_team_id(name, logo_url)')

        const { data: enhancedFixtures, error: joinError } = await supabase
            .from('fixtures')
            .select(`
          id, date_utc, status, venue,
          leagues ( id, name, country, logo_url ),
          home:teams!home_team_id ( id, name, logo_url ),
          away:teams!away_team_id ( id, name, logo_url )
       `)
            .filter('date_utc', 'gte', `${today}T00:00:00`)
            .filter('date_utc', 'lte', `${today}T23:59:59`)
            .order('date_utc', { ascending: true });

        if (joinError) throw joinError;

        return response.status(200).json({ fixtures: enhancedFixtures });

    } catch (error) {
        console.error('API Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
