import { createClient } from '@supabase/supabase-js';

const IMPORTANT_LEAGUES = [39, 140, 135, 78, 61, 71, 72, 618, 9, 2, 848]; // Added Copinha + others

export default async function handler(request, response) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiFootballKey = process.env.API_FOOTBALL_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate User
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return response.status(401).json({ error: 'Invalid Token' });
    }

    // 2. Check Subscription
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

    const isPremium = profile?.subscription_status === 'premium';

    // 3. If Free, return Locked
    if (!isPremium) {
        return response.status(200).json({
            locked: true,
            message: 'Live scores are for premium members only.',
            games: [] // Or sample data if we want to tease
        });
    }

    // 4. If Premium, Fetch Real Data
    // Cache for 60 seconds at Vercel edge
    response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    try {
        const url = `https://v3.football.api-sports.io/fixtures?live=all`;
        const res = await fetch(url, {
            headers: {
                'x-apisports-key': apiFootballKey
            }
        });

        const json = await res.json();

        if (!json.response) {
            return response.json({ locked: false, games: [] });
        }

        // Filter valid leagues
        const liveGames = json.response
            .filter(g => IMPORTANT_LEAGUES.includes(g.league.id))
            .map(g => ({
                id: g.fixture.id,
                time: g.fixture.status.elapsed,
                league: g.league.name,
                home: { name: g.teams.home.name, logo: g.teams.home.logo, goals: g.goals.home },
                away: { name: g.teams.away.name, logo: g.teams.away.logo, goals: g.goals.away }
            }));

        return response.status(200).json({
            locked: false,
            games: liveGames
        });

    } catch (error) {
        console.error('Live Fetch Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
