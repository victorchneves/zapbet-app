import { createClient } from '@supabase/supabase-js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const payload = request.body;
    const { event, customer, sale_id } = payload;

    // 1. Verify Event Type
    if (event !== 'SALE_APPROVED') {
        // We only care about approved sales for now
        return response.status(200).json({ message: 'Event ignored' });
    }

    if (!customer || !customer.email) {
        return response.status(400).json({ error: 'Missing customer email' });
    }

    const userEmail = customer.email;

    // 2. Initialize Admin Supabase Client (Service Role)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        console.error('Critical: SUPABASE_SERVICE_ROLE_KEY missing');
        return response.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log(`[Kirvano] Processing sale ${sale_id} for ${userEmail}`);

        // 3. Log Transaction
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                external_id: sale_id,
                user_email: userEmail,
                amount: payload.fiscal?.total_value || 0,
                status: 'approved',
                provider: 'kirvano',
                payload: payload
                // user_id will be mapped if we find the user below, or we update it later.
            });

        if (txError) console.error('Error logging transaction:', txError);

        // 4. Find User & Update Profile
        // Since we have 'email' in profiles, we can update directly.
        const { data, error } = await supabase
            .from('profiles')
            .update({
                subscription_status: 'premium',
                updated_at: new Date().toISOString()
            })
            .eq('email', userEmail)
            .select();

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn(`[Kirvano] User not found for email: ${userEmail}`);
            return response.status(200).json({ warning: 'User not found, but transaction logged.' });
        }

        // Optional: Update transaction with found user_id for completeness
        if (data[0]?.id) {
            await supabase
                .from('transactions')
                .update({ user_id: data[0].id })
                .eq('external_id', sale_id);
        }

        console.log(`[Kirvano] User ${userEmail} upgraded to PREMIUM!`);
        return response.status(200).json({ success: true, user: data[0] });

    } catch (error) {
        console.error('[Kirvano] Error processing webhook:', error);
        return response.status(500).json({ error: error.message });
    }
}
