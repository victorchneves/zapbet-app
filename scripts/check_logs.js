import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLogs() {
    console.log('--- Checking Transactions Log ---');

    const { data: txs, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching transactions:', error);
        return;
    }

    if (txs.length === 0) {
        console.log('No transactions found.');
    } else {
        txs.forEach(tx => {
            console.log(`[${tx.created_at}] Email: ${tx.user_email} | ID: ${tx.external_id} | Status: ${tx.status}`);
        });
    }
}

checkLogs();
