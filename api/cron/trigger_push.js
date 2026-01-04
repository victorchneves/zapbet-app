import { createClient } from '@supabase/supabase-js';

// Trigger this from GitHub Actions or Vercel Cron
// when the daily routine finishes.
export default async function handler(request, response) {
    const authHeader = request.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // return response.status(401).json({ error: 'Unauthorized' });
    }

    const { date } = request.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Find Featured Pick
        const { data: picks } = await supabase
            .from('daily_picks')
            .select(`
                *,
                fixtures(home:teams!home_team_id(name), away:teams!away_team_id(name))
            `)
            .eq('date', targetDate)
            .eq('is_featured', true)
            .limit(1);

        if (!picks || picks.length === 0) {
            return response.json({ message: 'No featured pick to adjust.' });
        }

        const pick = picks[0];

        // 2. Send Push
        // We reuse the /api/push/send logic, or call it internally.
        // For simplicity, let's just fetch our own endpoint (if base url known) or replicate logic.
        // Replicating logic is bad. Let's redirect logic?
        // No, let's just run the code here or make a shared service.
        // I will just use fetch to localhost since it is same deployment? 
        // Or import the handler? Importing handler is tricky with req/res.

        // BETTER: Use fetch to the absolute URL usually. 
        // But for now, let's just assume we want to call the logic. 
        // I will just copy the fetch call pattern.

        const host = request.headers.host; // e.g. localhost:3000 or myapp.vercel.app
        const protocol = host.includes('localhost') ? 'http' : 'https';

        const pushRes = await fetch(`${protocol}://${host}/api/push/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            },
            body: JSON.stringify({
                title: '🔥 Leitura Principal Disponível',
                message: `${pick.fixtures.home.name} vs ${pick.fixtures.away.name}. Confira a análise agora.`,
                url: '/picks'
            })
        });

        return response.json({
            success: true,
            push_status: pushRes.status
        });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
