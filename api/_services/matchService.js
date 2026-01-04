export async function getMatchDetails(fixtureId, supabase, apiFootballKey) {
    if (!fixtureId) throw new Error('Missing Fixture ID');

    // 1. Check DB for existing details
    // 1. Check DB for existing details
    const [fixtureRes, lineupsRes, eventsRes, statsRes, oddsRes, predictionsRes] = await Promise.all([
        supabase.from('fixtures').select(`*, leagues(*), home:teams!home_team_id(*), away:teams!away_team_id(*)`).eq('id', fixtureId).single(),
        supabase.from('lineups').select('*').eq('fixture_id', fixtureId).single(),
        supabase.from('events').select('*').eq('fixture_id', fixtureId).single(),
        supabase.from('stats').select('*').eq('fixture_id', fixtureId).single(),
        supabase.from('odds').select('*').eq('fixture_id', fixtureId).single(),
        supabase.from('predictions').select('*').eq('fixture_id', fixtureId).single()
    ]);

    if (fixtureRes.error) throw new Error('Fixture not found in DB. Run sync first.');

    let lineups = lineupsRes.data;
    let events = eventsRes.data;
    let stats = statsRes.data;
    let odds = oddsRes.data;
    let predictions = predictionsRes.data;

    // 2. If missing details, Fetch from API-Football
    // We check individually or just fetch all if any major one is missing to keep it simple?
    // Let's fetch missing parts.
    // FIX: Check if payload exists AND is not empty object (handles {} from empty JSONB)
    const isInvalid = (record) => !record || !record.payload || (typeof record.payload === 'object' && Object.keys(record.payload).length === 0);

    const needsFetch = isInvalid(lineups) ||
        isInvalid(events) ||
        isInvalid(stats) ||
        isInvalid(odds) ||
        isInvalid(predictions);

    // Only fetch if we have the key and data is actually missing
    if (needsFetch && apiFootballKey) {
        // Helper for logging
        const fetchWithLog = async (url) => {
            try {
                const res = await fetch(url, { headers: { 'x-apisports-key': apiFootballKey } });
                const json = await res.json();
                return json;
            } catch (err) {
                console.error(`[MATCH_SERVICE] Fetch Error:`, err);
                return { response: [] };
            }
        };

        const [apiLineups, apiEvents, apiStats, apiOdds, apiPredictions] = await Promise.all([
            isInvalid(lineups) ? fetchWithLog(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`) : Promise.resolve({}),
            isInvalid(events) ? fetchWithLog(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`) : Promise.resolve({}),
            isInvalid(stats) ? fetchWithLog(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`) : Promise.resolve({}),
            isInvalid(odds) ? fetchWithLog(`https://v3.football.api-sports.io/odds?fixture=${fixtureId}&bookmaker=1`) : Promise.resolve({}), // Bookmaker 1 = Bet365 (Good ref)
            isInvalid(predictions) ? fetchWithLog(`https://v3.football.api-sports.io/predictions?fixture=${fixtureId}`) : Promise.resolve({})
        ]);

        console.log(`[DEBUG] Raw Predictions Response: ${JSON.stringify(apiPredictions).substring(0, 200)}`);

        // Save Lineups
        if (apiLineups.response && apiLineups.response.length > 0) {
            const { error } = await supabase.from('lineups').upsert({
                fixture_id: fixtureId,
                confirmed: apiLineups.response[0].formation !== null, // approximate check
                payload: apiLineups.response
            }).select().single();
            if (!error) lineups = { payload: apiLineups.response };
        }

        // Save Events
        if (apiEvents.response) {
            await supabase.from('events').upsert({
                fixture_id: fixtureId,
                payload: apiEvents.response
            });
            events = { payload: apiEvents.response };
        }

        // Save Stats
        if (apiStats.response) {
            await supabase.from('stats').upsert({
                fixture_id: fixtureId,
                payload: apiStats.response
            });
            stats = { payload: apiStats.response };
        }

        // Save Odds (Generic)
        if (apiOdds.response && apiOdds.response.length > 0) {
            const bookmakerOdds = apiOdds.response[0].bookmakers[0]; // Gets the first bookmaker (Bet365 requested by ID)
            const bets = bookmakerOdds ? bookmakerOdds.bets : [];

            // We normalize structure to be generic
            const genericOdds = bets.map(bet => ({
                name: bet.name, // "Match Winner", "Goals Over/Under"
                values: bet.values // [{value: "Home", odd: 1.5}, ...]
            }));

            await supabase.from('odds').upsert({
                fixture_id: fixtureId,
                payload: genericOdds
            });
            console.log(`[DEBUG] Processed ${genericOdds.length} odds markets.`);
            odds = { payload: genericOdds };
        } else {
            console.log('[DEBUG] No odds returned from API.');
        }

        // Save Predictions
        if (apiPredictions.response && apiPredictions.response.length > 0) {
            // Detailed prediction data
            const predData = apiPredictions.response[0];
            await supabase.from('predictions').upsert({
                fixture_id: fixtureId,
                payload: predData
            });
            predictions = { payload: predData };

            // DEBUG PREDICTIONS
            console.log(`[DEBUG] Predictions received. Keys: ${Object.keys(predData).join(', ')}`);
            if (predData.lineups) {
                console.log(`[DEBUG] Predicted Lineups found: ${JSON.stringify(predData.lineups).substring(0, 100)}...`);
            } else {
                console.log('[DEBUG] No "lineups" key in predictions payload.');
            }

            // Fallback: If no official lineups, use Predicted Lineups
            if (!lineups || !lineups.payload || lineups.payload.length === 0) {
                // Safe check for structure
                try {
                    if (predData.lineups && Array.isArray(predData.lineups)) {
                        // Check if it's actually a player list (has team property)
                        // Some endpoints return just formations stats [{"formation":"4-4-2"}]
                        const hasTeam = predData.lineups.some(l => l.team);

                        if (hasTeam) {
                            console.log('[DEBUG] Using Predicted Lineups as fallback');
                            lineups = {
                                payload: [
                                    { team: { name: "Home (Provável)" }, startXI: predData.lineups.filter(l => l.team?.name === fixtureRes.data.home.name).map(p => ({ player: { name: p.name } })) },
                                    { team: { name: "Away (Provável)" }, startXI: predData.lineups.filter(l => l.team?.name === fixtureRes.data.away.name).map(p => ({ player: { name: p.name } })) }
                                ],
                                confirmed: false
                            };
                        } else {
                            console.log('[DEBUG] Prediction lineups valid but contain no team data (likely formations only). Skipping fallback.');
                        }
                    }
                } catch (err) {
                    console.error('[DEBUG] Error processing predicted lineups fallback:', err);
                }
            }
        }
    }

    return {
        fixture: fixtureRes.data,
        lineups,
        events,
        stats,
        odds,
        predictions,
        fetched_from_api: needsFetch
    };
}
