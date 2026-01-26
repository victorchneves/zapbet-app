import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getMatchDetails } from '../_services/matchService.js';
import { syncFixtures } from '../_services/syncService.js';
import { getStandings } from '../_services/standingsService.js';

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

export default async function handler(request, response) {

    // Only allow POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;


    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase configuration');
        return response.status(500).json({ error: 'Server misconfiguration: Missing Supabase keys.' });
    }

    // Initialize OpenAI Client
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OpenAI API Key');
        return response.status(500).json({ error: 'Server misconfiguration: Missing OpenAI key.' });
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

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

        if (profileError) {
            console.error('Profile Fetch Error:', profileError);
            throw new Error(`Failed to fetch profile: ${JSON.stringify(profileError)}`);
        }

        // 2.5. Check subscription status
        const isPremium = profile?.subscription_status === 'premium';

        // [LEGACY LIMIT REMOVED] Switching to Game-Based Limits (1 unlocked game per day)
        // See 'get_match_details' tool implementation below.

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

        if (!thread || true) { // FORCE NEW THREAD (DEBUG MODE)
            // Create new OpenAI Thread
            const newOpenAiThread = await openai.beta.threads.create();
            openAiThreadId = newOpenAiThread.id;

            // Save to DB (Update or Insert)
            if (thread) {
                await supabase.from('ai_threads').update({ openai_thread_id: openAiThreadId, messages: [] }).eq('id', thread.id);
            } else {
                const { data: newThread } = await supabase
                    .from('ai_threads')
                    .insert({
                        user_id: user.id,
                        openai_thread_id: openAiThreadId,
                        messages: []
                    })
                    .select()
                    .single();
                thread = newThread;
            }
        } else {
            // ... (original else block unreachable now)
            openAiThreadId = thread.openai_thread_id;
        }

        // [PHASE 2] Fetch Context Data (Top Games & Picks)
        const today = new Date().toISOString().split('T')[0];

        const [topGamesRes, picksRes, fixturesRes] = await Promise.all([
            supabase.from('daily_top_games').select('*').eq('date', today).single(),
            supabase.from('daily_picks').select('*').eq('date', today),
            supabase.from('fixtures')
                .select(`
                    id, 
                    date_utc, 
                    leagues (name), 
                    home:teams!home_team_id (name), 
                    away:teams!away_team_id (name)
                `)
                .filter('date_utc', 'gte', `${today}T00:00:00`)
                .filter('date_utc', 'lte', `${today}T23:59:59`)
                .limit(20) // Limit context size
        ]);

        const topGamesData = topGamesRes.data ? JSON.stringify(topGamesRes.data) : "None";
        const picksData = picksRes.data ? JSON.stringify(picksRes.data) : "None";

        // Format fixtures for readable context
        const fixturesList = fixturesRes.data
            ? fixturesRes.data.map(f =>
                `- [ID: ${f.id}] [LID: ${f.league_id}] [${f.leagues?.name}] ${f.home?.name} vs ${f.away?.name} at ${new Date(f.date_utc).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            ).join('\n')
            : "None";

        console.log('[DEBUG] GENERATED CONTEXT FIXTURES:', fixturesList);

        // 3.5. Heal Stuck Threads (Cancel Active Runs)
        try {
            const runs = await openai.beta.threads.runs.list(openAiThreadId);
            const activeRun = runs.data.find(r => ['queued', 'in_progress', 'requires_action'].includes(r.status));
            if (activeRun) {
                console.log(`[DEBUG] Found active run ${activeRun.id}. Cancelling to unblock thread...`);
                await openai.beta.threads.runs.cancel(openAiThreadId, activeRun.id);
                // Simple verify loop to ensure it's cancelled
                let checkStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, activeRun.id);
                while (['queued', 'in_progress', 'requires_action', 'cancelling'].includes(checkStatus.status)) {
                    await new Promise(r => setTimeout(r, 500));
                    checkStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, activeRun.id);
                }
                console.log(`[DEBUG] Run ${activeRun.id} cancelled successfully.`);
            }
        } catch (err) {
            console.warn('[DEBUG] Error checking active runs:', err);
            // Ignore - if it fails, maybe there's no run or API error, try proceeding.
        }

        // 4. Send Message to OpenAI
        console.log('[DEBUG] Sending message with Thread ID:', openAiThreadId);
        await openai.beta.threads.messages.create(openAiThreadId, {
            role: 'user',
            content: message,
        });

        // 5. Run Assistant
        console.log('[DEBUG] Creating run with Assistant ID:', ASSISTANT_ID);
        const run = await openai.beta.threads.runs.create(openAiThreadId, {
            assistant_id: ASSISTANT_ID,
            model: 'gpt-4o-mini',
            tools: [{
                type: "function",
                function: {
                    name: "get_match_details",
                    description: "Fetch detailed match info including LINEUPS, STATS, ODDS, and PREDICTIONS. Use this when the user asks about a specific match (e.g. 'odds do jogo', 'escalação'). IMPORTANT: If the user provides an ID (e.g. from the UI button), USE THAT ID directly. Otherwise, look up the ID in your context list.",
                    parameters: {
                        type: "object",
                        properties: {
                            fixture_id: {
                                type: "integer",
                                description: "The fixture ID. If user prompt contains 'ID: 12345', use 12345."
                            }
                        },
                        required: ["fixture_id"]
                    }
                }
            }, {
                type: "function",
                function: {
                    name: "check_schedule",
                    description: "Check the football schedule for a specific date. Use this when the user asks about games on a future date (e.g. 'tomorrow', 'next Tuesday') or a specific date (YYYY-MM-DD). Returns a list of matches with IDs.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: {
                                type: "string",
                                description: "The date to check in YYYY-MM-DD format."
                            }
                        },
                        required: ["date"]
                    }
                }
            }, {
                type: "function",
                function: {
                    name: "get_standings",
                    description: "Fetch the league table. POPULAR LEAGUE IDs: Premier League=39, La Liga=140, Serie A=135, Bundesliga=78, Ligue 1=61, Brasileirão=71. Use these IDs if the user asks generally (e.g. 'tabela do italiano'). If referencing a specific match in context, use that match's league_id.",
                    parameters: {
                        type: "object",
                        properties: {
                            league_id: {
                                type: "integer",
                                description: "The League ID. Use 135 for Serie A/Italiano, 71 for Brasil, 39 for Premier League."
                            },
                            season: {
                                type: "integer",
                                description: "The season year (e.g. 2024, 2025). Try 2024 for completed/current seasons if Free Plan."
                            }
                        },
                        required: ["league_id", "season"]
                    }
                }
            }],
            tool_choice: "auto",
            additional_instructions: `
        [INSTRUÇÃO PRIORITÁRIA]
        [INSTRUÇÃO ÚNICA: SIGA O FORMATO]
        Você é um sistema automatizado. Sua ÚNICA função é preencher o relatório abaixo com os dados REAIS obtidos da ferramenta 'get_match_details'.
        
        NÃO escreva introduções. NÃO escreva conclusões. NÃO dê conselhos genéricos.
        APENAS PREENCHA O MODELO.

        [FERRAMENTAS]
        1. Use 'get_match_details' para pegar odds e estatísticas.
        2. Use 'get_standings' apenas se precisar da tabela.

        [MODELO DE RESPOSTA OBRIGATÓRIO]
        # 📊 Análise: [Time Casa] x [Time Fora]

        ## 🧠 Raio-X (Dados Oficiais)
        **Forma (Últimos 5)**: 
        - [Casa]: [Lista de V/E/D]
        - [Fora]: [Lista de V/E/D]
        
        **Médias de Gols**:
        - [Casa]: [Marcados] | [Sofridos]
        - [Fora]: [Marcados] | [Sofridos]

        ## 💰 Gestão (${profile.bankroll})
        - Stake Sugerida: R$ [1 a 3% da banca]

        ## 🎯 Recomendações
        
        ### 1. Aposta Segura (Odd ~1.50)
        - **Entrada**: [Mercado] @ [Odd]
        - **Motivo**: [CITE O DADO EXATO QUE JUSTIFICA. Ex: "Time A venceu 80% em casa"]

        ### 2. Aposta de Valor (Odd ~2.00)
        - **Entrada**: [Mercado] @ [Odd]
        - **Motivo**: [CITE O DADO EXATO]

        ### 3. Aposta Ousada (Odd 3.00+)
        - **Entrada**: [Mercado] @ [Odd]
        - **Motivo**: [CITE O DADO EXATO]

        ---
        **Pergunta**: [Uma pergunta curta sobre a estratégia?]
        
        [USER CONTEXT]
        Bankroll: ${profile.bankroll}
        Risk Profile: ${profile.risk_profile}
      `
        });

        console.log('[DEBUG] Run Created:', JSON.stringify(run, null, 2));

        // 6. Poll for Completion (with Tool Handling)
        let runStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, run.id);
        console.log(`[DEBUG] Initial Run Status: ${runStatus.status} `);

        let attempts = 0;
        const maxAttempts = 60; // Increased timeout for deep analysis

        while (runStatus.status !== 'completed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(openAiThreadId, run.id);
            console.log(`[DEBUG] Polling Status: ${runStatus.status} `);
            attempts++;

            if (runStatus.status === 'requires_action') {
                console.log('[DEBUG] Run requires action (Tool Call detected)');
                const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
                const toolOutputs = [];

                for (const toolCall of toolCalls) {
                    if (toolCall.function.name === 'get_match_details') {
                        const args = JSON.parse(toolCall.function.arguments);
                        // Ensure fixture_id is integer
                        const requestedFixtureId = parseInt(args.fixture_id, 10);
                        console.log(`[TOOL] Executing get_match_details for ID: ${requestedFixtureId} `);

                        try {
                            // [SMART LIMIT LOGIC - STRICT]
                            // Check limits before fetching data
                            if (!isPremium) {
                                const today = new Date().toISOString().split('T')[0];

                                // Check what matches user has already unlocked today
                                const { data: existingUnlocks } = await supabase
                                    .from('daily_unlocked_fixtures')
                                    .select('fixture_id')
                                    .eq('user_id', user.id)
                                    .eq('date', today);

                                const unlockedFixtureIds = existingUnlocks?.map(u => u.fixture_id) || [];
                                const isNewFixture = !unlockedFixtureIds.includes(requestedFixtureId);

                                // If trying to access a 2nd fixture (limit is 1)
                                if (isNewFixture && unlockedFixtureIds.length >= 1) {
                                    console.log(`[LIMIT LIMIT] User ${user.id} tried to access 2nd game(ID: ${requestedFixtureId})`);

                                    toolOutputs.push({
                                        tool_call_id: toolCall.id,
                                        output: JSON.stringify({
                                            error: "LIMIT_REACHED",
                                            message: "BLOCK_ANALYSIS: The user is on the Free Plan and has already analyzed their 1 allowed match for today. DO NOT provide any analysis. Politely inform them they reached the daily limit and must wait for tomorrow or upgrade to Premium."
                                        })
                                    });
                                    continue; // Skip the actual fetch
                                }

                                // If eligible, record this unlock
                                if (isNewFixture) {
                                    await supabase.from('daily_unlocked_fixtures').insert({
                                        user_id: user.id,
                                        date: today,
                                        fixture_id: requestedFixtureId
                                    });
                                }
                            }

                            console.log('[TOOL] API Key Present:', !!process.env.API_FOOTBALL_KEY);
                            const details = await getMatchDetails(requestedFixtureId, supabase, process.env.API_FOOTBALL_KEY);
                            // FAIL-PROOF DATA ASSEMBLY
                            const summary = {
                                lineups: (details.lineups?.payload && details.lineups.payload.length > 0)
                                    ? details.lineups.payload
                                    : "DATA_UNAVAILABLE (Use predicted lineups if available)",

                                stats: (details.stats?.payload && Object.keys(details.stats.payload).length > 0)
                                    ? details.stats.payload
                                    : "DATA_UNAVAILABLE (Game likely not started)",

                                odds: (details.odds?.payload && details.odds.payload.length > 0)
                                    ? details.odds.payload
                                    : "DATA_UNAVAILABLE (Warn user: Low liquidity or market suspended)",

                                predictions: details.predictions?.payload || "DATA_UNAVAILABLE",

                                standings: details.fixture?.leagues?.standings || "DATA_UNAVAILABLE"
                            };

                            console.log('[TOOL] FINAL PAYLOAD TO AI:', JSON.stringify(summary, null, 2));

                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: JSON.stringify(summary)
                            });
                        } catch (err) {
                            console.error('[TOOL ERROR]', err);
                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: JSON.stringify({ error: "Failed to fetch details", message: err.message })
                            });
                        }
                    } else if (toolCall.function.name === 'check_schedule') {
                        const args = JSON.parse(toolCall.function.arguments);
                        const targetDate = args.date;
                        console.log(`[TOOL] Checking schedule for ${targetDate}`);

                        try {
                            // 1. Check DB first
                            const { data: existingFixtures } = await supabase
                                .from('fixtures')
                                .select('id, date_utc, leagues(name), home:teams!home_team_id(name), away:teams!away_team_id(name)')
                                .filter('date_utc', 'gte', `${targetDate} T00:00:00`)
                                .filter('date_utc', 'lte', `${targetDate} T23: 59: 59`)
                                .limit(50);

                            let fixturesToReturn = existingFixtures || [];

                            // 2. If empty, Auto-Sync
                            if (fixturesToReturn.length === 0) {
                                console.log(`[TOOL] No games found in DB for ${targetDate}.Auto - syncing...`);
                                const syncResult = await syncFixtures(targetDate, supabase, process.env.API_FOOTBALL_KEY);

                                // Re-query after sync (or use sync result formatted)
                                if (syncResult.fixtures) {
                                    fixturesToReturn = syncResult.fixtures.map(f => ({
                                        id: f.id,
                                        date_utc: f.time,
                                        leagues: { name: f.league },
                                        home: { name: f.home },
                                        away: { name: f.away }
                                    }));
                                }
                            }

                            // 3. Format output
                            const formattedList = fixturesToReturn.map(f =>
                                `- [ID: ${f.id}][${f.leagues?.name || f.leagues?.name}] ${f.home?.name} vs ${f.away?.name} at ${new Date(f.date_utc).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} `
                            ).join('\n') || "No games found for this date.";

                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: formattedList
                            });

                        } catch (err) {
                            console.error('[TOOL ERROR] check_schedule:', err);
                            toolOutputs.push({ tool_call_id: toolCall.id, output: JSON.stringify({ error: "Failed to check schedule", details: err.message }) });
                        }
                    } else if (toolCall.function.name === 'get_standings') {
                        const args = JSON.parse(toolCall.function.arguments);
                        console.log(`[TOOL] Fetching standings for League ${args.league_id}`);
                        try {
                            const standings = await getStandings(args.league_id, args.season, supabase, process.env.API_FOOTBALL_KEY);

                            // FORCE SIMPLE FORMATTING (Mobile Friendly)
                            let formattedStandings = "No standings available.";

                            if (standings && standings.length > 0 && standings[0].league && standings[0].league.standings) {
                                const table = standings[0].league.standings[0];
                                formattedStandings = `** Classificação ${standings[0].league.name} (${standings[0].league.season})**\n\n`;
                                formattedStandings += table.map(t =>
                                    `${t.rank}. ${t.team.name} - ${t.points} pts(${t.all.played}J ${t.all.win}V ${t.all.draw}E ${t.all.lose}D)`
                                ).join('\n');
                            }

                            toolOutputs.push({
                                tool_call_id: toolCall.id,
                                output: formattedStandings
                            });
                        } catch (err) {
                            toolOutputs.push({ tool_call_id: toolCall.id, output: JSON.stringify({ error: err.message }) });
                        }
                    }
                }

                if (toolOutputs.length > 0) {
                    console.log(`[DEBUG] Submitting ${toolOutputs.length} tool outputs to OpenAI...`);
                    // Log the first output's size to ensure we aren't sending giant payloads
                    console.log(`[DEBUG] Tool Output 0 Payload Size: ${toolOutputs[0].output.length} characters`);

                    await openai.beta.threads.runs.submitToolOutputs(openAiThreadId, run.id, {
                        tool_outputs: toolOutputs
                    });
                    console.log('[DEBUG] FULL TOOL OUTPUT:', JSON.stringify(toolOutputs));
                    console.log('[DEBUG] Tool outputs submitted successfully. Resuming run...');
                }
            }

            if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
                console.error('Run failed:', runStatus.last_error);
                return response.status(500).json({ error: `AI processing failed with status: ${runStatus.status} ` });
            }
        }

        if (attempts >= maxAttempts && runStatus.status !== 'completed') {
            console.error('Run timed out:', run.id);
            return response.status(500).json({ error: 'AI processing timed out.' });
        }

        // 7. Get Messages
        const messages = await openai.beta.threads.messages.list(openAiThreadId);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage.content[0].text.value;

        // 8. Update DB Thread History (Async - don't block response)
        try {
            const currentMessages = Array.isArray(thread.messages) ? thread.messages : [];
            const newMessages = [
                ...currentMessages,
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'assistant', content: assistantResponse, timestamp: new Date() }
            ];

            await supabase
                .from('ai_threads')
                .update({ messages: newMessages, updated_at: new Date() })
                .eq('id', thread.id);
        } catch (dbError) {
            console.error('[DB ERROR] Failed to update thread history:', dbError);
            // Non-critical error, do not fail the request
        }

        return response.status(200).json({
            response: assistantResponse,
            threadId: thread.id
        });

    } catch (error) {
        console.error('AI Error:', error);
        return response.status(500).json({ error: error.message });
    }
}

