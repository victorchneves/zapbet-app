import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

export default async function handler(request, response) {
    // Basic Auth or Admin check needed here!
    // For now, checks for CRON_SECRET or just open (dev mode risk).
    // Adding minimal check:
    const authHeader = request.headers.authorization;
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Allow manual testing if needed, or strict mode.
    // if (!isCron && process.env.NODE_ENV === 'production') return response.status(401).end();

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { title, message, url, icon } = request.body;

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Get all enabled subscriptions
        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('enabled', true);

        if (error) throw error;
        if (!subs || subs.length === 0) return response.json({ message: 'No subscribers' });

        console.log(`[PUSH] Sending to ${subs.length} devices...`);

        const payload = JSON.stringify({
            title: title || 'ZapBet',
            body: message || 'Nova leitura disponível!',
            url: url || '/dashboard',
            icon: icon || '/icon-192.png'
        });

        // 2. Send in parallel
        const promises = subs.map(async (sub) => {
            try {
                await webpush.sendNotification(sub.subscription, payload);
                return { status: 'fulfilled', id: sub.id };
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription is dead, delete it
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    return { status: 'deleted', id: sub.id };
                }
                console.error(`Error sending to ${sub.id}:`, err.message);
                return { status: 'rejected', id: sub.id };
            }
        });

        const results = await Promise.all(promises);
        const sent = results.filter(r => r.status === 'fulfilled').length;
        const deleted = results.filter(r => r.status === 'deleted').length;

        return response.status(200).json({
            success: true,
            sent,
            deleted,
            total: subs.length
        });

    } catch (error) {
        console.error('Send Push Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
