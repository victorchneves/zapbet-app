import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return response.status(401).json({ error: 'Invalid Token' });

    try {
        const subscription = request.body;

        // Save to DB
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                subscription,
                updated_at: new Date()
            }, { onConflict: 'user_id' }); // MVP: One subscription per user (or manage multiple devices later)

        if (error) throw error;

        return response.status(200).json({ success: true });

    } catch (error) {
        console.error('Push Subscribe Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
