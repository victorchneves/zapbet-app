import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase Admin Client (requires SERVICE_ROLE_KEY)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize OpenAI Client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

export default async function handler(request, response) {
    // Only allow POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Validate Auth Header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return response.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return response.status(401).json({ error: 'Invalid token' });
    }

    try {
        const { action, message, context } = request.body;

        // 2. Fetch User Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw new Error('Failed to fetch profile');

        // 3. Find or Create Thread
        // We try to find an active thread for today/current session or just the latest one
        // For simplicity in MVP: 1 thread per user (persistent)
        let { data: thread } = await supabase
            .from('ai_threads')
            .select('*')
            .eq('user_id', user.id)
            .single();

        let threadId;
        let openAiThreadId;

        if (!thread) {
            // Create new OpenAI Thread
            const newOpenAiThread = await openai.beta.threads.create();
            openAiThreadId = newOpenAiThread.id;

            // Save to DB
            const { data: newThread } = await supabase
                .from('ai_threads')
                .insert({
                    user_id: user.id,
                    openai_thread_id: openAiThreadId, // Start storing this if schema allows, or just use JSON
                    messages: []
                })
                .select()
                .single();

            threadId = newThread.id;
            thread = newThread;
        } else {
            // Retrieve existing OpenAI Thread ID from DB
            // We need to add 'openai_thread_id' to schema or store it in 'metadata' column if it exists
            // For now, assuming we might need to update schema or perform a check
            // If we don't have it in DB, we might need to create a new one, but let's assume we add it to the schema.
            // Wait, schema didn't have 'openai_thread_id'. I should add it.
            // Fallback if not present (migration needed):
            openAiThreadId = thread.openai_thread_id;
            if (!openAiThreadId) {
                const newOpenAiThread = await openai.beta.threads.create();
                openAiThreadId = newOpenAiThread.id;
                await supabase.from('ai_threads').update({ openai_thread_id: openAiThreadId }).eq('id', thread.id);
            }
        }

        // [PHASE 2] Fetch Context Data (Top Games & Picks)
        const today = new Date().toISOString().split('T')[0];

        const [topGamesRes, picksRes] = await Promise.all([
            supabase.from('daily_top_games').select('*').eq('date', today).single(),
            supabase.from('daily_picks').select('*').eq('date', today)
        ]);

        const topGamesData = topGamesRes.data ? JSON.stringify(topGamesRes.data) : "None";
        const picksData = picksRes.data ? JSON.stringify(picksRes.data) : "None";

        // 4. Send Message to OpenAI
        await openai.beta.threads.messages.create(openAiThreadId, {
            role: 'user',
            content: message,
        });

        // 5. Run Assistant
        const run = await openai.beta.threads.runs.create(openAiThreadId, {
            assistant_id: ASSISTANT_ID,
            additional_instructions: `
        [USER CONTEXT]
        Bankroll: ${profile.bankroll}
        Risk Profile: ${profile.risk_profile}
        Subscription: ${profile.subscription_status}

        [TODAY'S DATA REPOSITORY]
        Date: ${today}
        Daily Top Games: ${topGamesData}
        Daily Picks: ${picksData}
      `
        });

        // 6. Poll for completion (Simple polling for MVP)
        let runStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, run.id);

        // Safety timeout loop
        let attempts = 0;
        while (runStatus.status !== 'completed' && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, run.id);
            attempts++;

            if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
                throw new Error(`Run failed with status: ${runStatus.status}`);
            }
        }

        // 7. Get Messages
        const messages = await openai.beta.threads.messages.list(openAiThreadId);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage.content[0].text.value;

        // 8. Update DB Thread History (Async)
        const newMessages = [
            ...thread.messages,
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: assistantResponse, timestamp: new Date() }
        ];

        await supabase
            .from('ai_threads')
            .update({ messages: newMessages, updated_at: new Date() })
            .eq('id', thread.id);

        return response.status(200).json({
            response: assistantResponse,
            threadId: thread.id
        });

    } catch (error) {
        console.error('AI Error:', error);
        return response.status(500).json({ error: error.message });
    }
}
