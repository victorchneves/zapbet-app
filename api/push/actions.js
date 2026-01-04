import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = request.query;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!supabaseServiceKey || !vapidPrivateKey) {
        return response.status(500).json({ error: 'Server config error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        if (action === 'subscribe') {
            const { subscription, user_id } = request.body;
            if (!subscription || !subscription.endpoint) {
                return response.status(400).json({ error: 'Invalid subscription' });
            }

            // Upsert subscription
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: user_id || null, // Can be null for Anon, but ideal to bind
                    subscription: subscription,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'subscription' }) // We need unique constraint on database or manage dups
                // Actually JSONB comparison is hard. Usually we check endpoint URL.
                // For MVP let's just insert.
                .select();

            if (error) throw error;
            return response.status(200).json({ success: true });
        }
        else if (action === 'send') {
            // Protected Logic
            const authHeader = request.headers['authorization'];
            const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

            // Allow admin or cron
            if (!isCron && process.env.NODE_ENV === 'production') {
                return response.status(401).json({ error: 'Unauthorized' });
            }

            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

            const { title, message, url } = request.body;
            const payload = JSON.stringify({ title, body: message, url });

            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('enabled', true);

            if (!subs || subs.length === 0) return response.json({ sent: 0 });

            const results = await Promise.allSettled(
                subs.map(sub =>
                    webpush.sendNotification(sub.subscription, payload)
                        .catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                // Delete dead sub
                                return supabase.from('push_subscriptions').delete().eq('id', sub.id).then(() => 'deleted');
                            }
                            throw err;
                        })
                )
            );

            const sent = results.filter(r => r.status === 'fulfilled' && r.value !== 'deleted').length;
            return response.status(200).json({ success: true, sent });
        }
        else {
            return response.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Push Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
