export async function syncFixtures(date, supabase, apiFootballKey) {
    if (!date) throw new Error('Date is required for sync');
    if (!apiFootballKey) throw new Error('API Key is required');

    console.log(`[SYNC_SERVICE] Syncing fixtures for ${date}...`);

    // 1. Fetch Fixtures from API-Football
    const apiRes = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: {
            'x-apisports-key': apiFootballKey,
            'x-rapidapi-host': 'v3.football.api-sports.io'
        }
    });

    if (!apiRes.ok) {
        throw new Error(`API-Football responded with ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const fixtures = data.response;

    if (!fixtures || fixtures.length === 0) {
        return { message: 'No fixtures found for this date', count: 0, stats: { leagues: 0, teams: 0, fixtures: 0 } };
    }

    console.log(`[SYNC_SERVICE] Found ${fixtures.length} fixtures. Processing...`);

    let stats = { leagues: 0, teams: 0, fixtures: 0 };

    // Top 5 Leagues + Brazil + Copinha (ID 618 confirmed)
    const IMPORTANT_LEAGUES = [39, 140, 135, 78, 61, 71, 72, 618];

    const relevantFixtures = fixtures.filter(f => IMPORTANT_LEAGUES.includes(f.league.id));

    // Fallback: If no major games, take first 50 to avoid empty DB
    const targetFixtures = relevantFixtures.length > 0 ? relevantFixtures : fixtures.slice(0, 50);

    for (const item of targetFixtures) {
        const { fixture, league, teams, goals, score } = item;

        // Upsert League
        const { error: leagueError } = await supabase
            .from('leagues')
            .upsert({
                id: league.id,
                name: league.name,
                country: league.country,
                season: league.season,
                logo_url: league.logo,
                active: true
            })
            .select();

        if (!leagueError) stats.leagues++;

        // Upsert Teams (Home & Away)
        const { error: homeError } = await supabase.from('teams').upsert({
            id: teams.home.id,
            name: teams.home.name,
            logo_url: teams.home.logo
        });
        const { error: awayError } = await supabase.from('teams').upsert({
            id: teams.away.id,
            name: teams.away.name,
            logo_url: teams.away.logo
        });

        if (!homeError && !awayError) stats.teams += 2;

        // Upsert Fixture
        const { error: fixtureError } = await supabase.from('fixtures').upsert({
            id: fixture.id,
            league_id: league.id,
            season: league.season,
            date_utc: fixture.date,
            status: fixture.status.short, // 'NS', 'FT', etc.
            home_team_id: teams.home.id,
            away_team_id: teams.away.id,
            venue: fixture.venue.name,
            referee: fixture.referee
        });

        if (!fixtureError) stats.fixtures++;
    }

    return {
        message: 'Sync successful',
        processed: targetFixtures.length,
        stats,
        fixtures: targetFixtures.map(f => ({
            id: f.fixture.id,
            home: f.teams.home.name,
            away: f.teams.away.name,
            league: f.league.name,
            time: f.fixture.date
        }))
    };
}
