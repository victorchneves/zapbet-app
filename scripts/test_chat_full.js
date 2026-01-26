
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('1. Creating/Signing in Test User...');
    const email = `test_chat_${Date.now()}@example.com`;
    const password = 'password123';

    // SignUp (auto-confirms if disabled, or we can use admin to create)
    const { data: { user }, error: createError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (createError) {
        console.error('Signup Error:', createError);
        // Try sign in
        const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (signInError) throw signInError;
        return testChat(session.access_token);
    }

    // If signup worked, we might not have a session if email confirmation is required.
    // Use admin to generate link or just sign in? 
    // Actually, with service_role we can just create a user or get a token.
    // Easier: Use signInWithPassword immediately if auto-confirm is on.
    // If not, use admin.auth.admin.createUser which auto-confirms?

    // Let's try signing in.
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError) {
        console.log('Login failed (maybe email not confirmed). Trying admin create...');
        // This part might fail if email exists, but we used unique email.
    }

    if (sessionData?.session) {
        await testChat(sessionData.session.access_token);
    } else {
        console.error('Could not get session.');
    }
}

async function testChat(token) {
    console.log('2. Testing Chat API with Token...');
    try {
        const res = await fetch('http://localhost:3000/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: 'Hello, are you working?',
                context: { fixtureId: 123 }
            })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Body:', text);

    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

run();
