import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { subscription, user_id } = request.body;

    if (!subscription || !subscription.endpoint) {
        return response.status(400).json({ error: 'Invalid subscription object' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // Upsert subscription
        // We use endpoint as unique key implicitly, but our schema uses ID.
        // Let's check if it exists first to avoid duplicates.

        // Actually, our table doesn't have unique constraint on subscription->>endpoint yet?
        // Let's just insert for now, or match by user_id if we want 1 device per user (no, users have multiple devices).
        // Best approach: Add logic to cleanup duplicates later. Simple insert for MVP.

        const { data, error } = await supabase
            .from('push_subscriptions')
            .insert({
                user_id: user_id, // Can be null for unauth users? Scheme says NOT NULL. 
                // So we demand user_id. Frontend must send it.
                subscription: subscription,
                enabled: true
            });

        if (error) throw error;

        return response.status(201).json({ success: true });
    } catch (error) {
        console.error('Subscribe Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
