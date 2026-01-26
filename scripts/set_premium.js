
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setPremium(email) {
    if (!email) {
        console.error('Please provide an email address.');
        console.log('Usage: node scripts/set_premium.js <email>');
        process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}...`);

    // 1. Find User by Email (using Admin Auth API)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.error('❌ User not found!');
        return;
    }

    console.log(`✅ User found: ${user.id}`);

    // 2. Update Profile
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ subscription_status: 'premium' })
        .eq('id', user.id);

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log(`🎉 Success! User ${email} is now PREMIUM.`);
    }
}

const emailArg = process.argv[2];
setPremium(emailArg);
