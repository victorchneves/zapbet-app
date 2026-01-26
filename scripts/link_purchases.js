const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function linkOrphanPurchases() {
    console.log('🔍 Buscando compras órfãs (aprovadas, mas sem user_id)...');

    // 1. Get all orphan transactions
    const { data: orphans, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'approved')
        .is('user_id', null);

    if (txError) {
        console.error('Erro ao buscar transações:', txError);
        return;
    }

    if (!orphans || orphans.length === 0) {
        console.log('✅ Nenhuma compra órfã encontrada.');
        return;
    }

    console.log(`⚠️ Encontradas ${orphans.length} compras sem dono.`);

    // 2. Try to find user IDs for these emails
    let linkedCount = 0;

    for (const tx of orphans) {
        process.stdout.write(`\nProcessando ${tx.user_email}... `);

        // Find user by email
        // Note: We can't query auth.users directly via client easily unless we have specific admin access or view
        // But we DO have 'profiles' which mirrors auth.users.
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, subscription_status')
            .eq('email', tx.user_email)
            .single();

        if (profile) {
            console.log(`✅ Usuário Encontrado! (ID: ${profile.id})`);

            // 3. Update Transaction
            await supabase
                .from('transactions')
                .update({ user_id: profile.id })
                .eq('id', tx.id);

            // 4. Update Profile to Premium
            if (profile.subscription_status !== 'premium') {
                await supabase
                    .from('profiles')
                    .update({ subscription_status: 'premium' })
                    .eq('id', profile.id);
                console.log('   -> Status atualizado para PREMIUM');
            } else {
                console.log('   -> Usuário já era Premium');
            }
            linkedCount++;
        } else {
            console.log('❌ Usuário ainda não cadastrado no app.');
        }
    }

    console.log(`\n🎉 Processo finalizado! ${linkedCount}/${orphans.length} compras vinculadas.`);
}

linkOrphanPurchases();
