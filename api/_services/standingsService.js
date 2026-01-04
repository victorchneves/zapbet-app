export async function getStandings(leagueId, season, supabase, apiFootballKey) {
    if (!leagueId || !season) throw new Error('League ID and Season required');

    // 1. Check DB
    const { data: existing } = await supabase
        .from('standings')
        .select('*')
        .eq('league_id', leagueId)
        .eq('season', season)
        .single();

    if (existing) {
        return existing.payload;
    }

    // 2. Fetch API
    if (!apiFootballKey) throw new Error('API Key Missing');

    console.log(`[STANDINGS_SERVICE] Fetching standings for League ${leagueId}/${season}...`);

    const res = await fetch(`https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`, {
        headers: {
            'x-apisports-key': apiFootballKey
        }
    });

    if (!res.ok) throw new Error('Failed to fetch from API-Football');

    const json = await res.json();
    console.log('[DEBUG] Raw Standings Response:', JSON.stringify(json).substring(0, 200) + '...'); // Log part of it
    const standingsData = json.response;

    if (json.errors && json.errors.plan) {
        console.log(`[STANDINGS_SERVICE] Free Plan Restriction: ${json.errors.plan}`);
        // Free plan limitation: usually 2024 is the latest available.
        // If we tried 2026/2025 and failed, allow falling back further only if we haven't gone too far.
        // Let's brute force fallback to 2024 if we are > 2024.
        if (season > 2024) {
            console.log(`[STANDINGS_SERVICE] Falling back to 2024 due to plan limit...`);
            return getStandings(leagueId, 2024, supabase, apiFootballKey);
        }
        return { message: "Upgrade to API-Football Pro to see current standings.", plan_error: true };
    }

    if (!standingsData || standingsData.length === 0) {
        // ... (existing empty check)
        const currentYear = new Date().getFullYear();
        if (season >= currentYear - 1) { // If we are 2026 or 2025, try going down
            // Prevent infinite loop if we already are at target
            const nextSeason = season - 1;
            console.log(`[STANDINGS_SERVICE] Standings empty for ${season}, trying fallback to ${nextSeason}...`);
            return getStandings(leagueId, nextSeason, supabase, apiFootballKey);
        }
        return null;
    }

    // 3. Save to DB
    // The API structure is response[0].league.standings (array of arrays for groups)
    // We store the whole 'response' or simplified? Store full for flexibility.

    await supabase.from('standings').upsert({
        league_id: leagueId,
        season: season,
        payload: standingsData
    });

    return standingsData;
}
