import { createClient } from '@supabase/supabase-js';
import { addDays, format } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) return response.status(401).json({ error: 'Unauthorized' });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const today = new Date();
        const nextWeek = addDays(today, 7);

        const startStr = format(today, 'yyyy-MM-dd');
        const endStr = format(nextWeek, 'yyyy-MM-dd');

        const { data: fixtures, error } = await supabase
            .from('fixtures')
            .select(`
          id, date_utc, status,
          leagues ( id, name, country, logo_url ),
          home:teams!home_team_id ( id, name, logo_url ),
          away:teams!away_team_id ( id, name, logo_url )
       `)
            .gte('date_utc', `${startStr}T00:00:00`)
            .lte('date_utc', `${endStr}T23:59:59`)
            .order('date_utc', { ascending: true });

        if (error) throw error;

        return response.status(200).json({ fixtures });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
