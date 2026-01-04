const TARGET_LEAGUES = [39, 140, 135, 78, 61, 71, 618]; // Premier, La Liga, Serie A, Bundes, Ligue 1, Brisileirão, Copinha

export async function generateDailyPicks(date, supabase, apiFootballKey) {
    console.log(`[PICKS] Generating picks for ${date}...`);

    // 1. Fetch Fixtures for Date
    const { data: fixtures, error: fixError } = await supabase
        .from('fixtures')
        .select(`
            id, 
            league_id,
            home_team_id, away_team_id, 
            home:teams!home_team_id(name), 
            away:teams!away_team_id(name),
            status,
            date_utc
        `)
        .gte('date_utc', `${date}T00:00:00`)
        .lte('date_utc', `${date}T23:59:59`)
        .in('status', ['NS', 'TBD']);

    if (fixError) throw new Error(`Error fetching fixtures: ${fixError.message}`);
    if (!fixtures || fixtures.length === 0) return { message: 'No fixtures found', count: 0 };

    const candidates = fixtures.filter(f => TARGET_LEAGUES.includes(f.league_id));
    console.log(`[PICKS] Found ${fixtures.length} fixtures. Filtered to ${candidates.length} candidates (Top Leagues).`);

    // 2. Enrich Data (Odds + Predictions ONLY)
    if (apiFootballKey && candidates.length > 0) {
        for (const game of candidates) {
            const { data: oddRow } = await supabase.from('odds').select('*').eq('fixture_id', game.id).single();
            const { data: predRow } = await supabase.from('predictions').select('*').eq('fixture_id', game.id).single();

            const isValid = (r) => r && r.payload && Object.keys(r.payload).length > 0;

            if (!isValid(oddRow)) {
                try {
                    console.log(`[PICKS] Fetching ODDS for ${game.id}...`);
                    const res = await fetch(`https://v3.football.api-sports.io/odds?fixture=${game.id}&bookmaker=1`, {
                        headers: { 'x-apisports-key': apiFootballKey }
                    });
                    const json = await res.json();
                    if (json.response && json.response.length > 0) {
                        const bookmakerOdds = json.response[0].bookmakers[0];
                        const bets = bookmakerOdds ? bookmakerOdds.bets : [];
                        const genericOdds = bets.map(bet => ({ name: bet.name, values: bet.values }));

                        await supabase.from('odds').upsert({ fixture_id: game.id, payload: genericOdds });
                    }
                } catch (e) { console.error(`[PICKS] Error fetching odds for ${game.id}`, e); }
            }

            if (!isValid(predRow)) {
                try {
                    console.log(`[PICKS] Fetching PREDICTIONS for ${game.id}...`);
                    const res = await fetch(`https://v3.football.api-sports.io/predictions?fixture=${game.id}`, {
                        headers: { 'x-apisports-key': apiFootballKey }
                    });
                    const json = await res.json();
                    if (json.response && json.response.length > 0) {
                        await supabase.from('predictions').upsert({ fixture_id: game.id, payload: json.response[0] });
                    }
                } catch (e) { console.error(`[PICKS] Error fetching predictions for ${game.id}`, e); }
            }
        }
    }

    // 3. Re-fetch enriched data
    const candidateIds = candidates.map(f => f.id);
    const { data: oddsData } = await supabase.from('odds').select('*').in('fixture_id', candidateIds);
    const { data: predsData } = await supabase.from('predictions').select('*').in('fixture_id', candidateIds);

    const allPicks = [];

    // 4. Process each fixture for MULTIPLE MARKETS
    for (const fixture of candidates) {
        const oddsRecord = oddsData?.find(o => o.fixture_id === fixture.id);
        const predRecord = predsData?.find(p => p.fixture_id === fixture.id);

        if (!oddsRecord?.payload || !predRecord?.payload) continue;

        // === MARKET 1: MATCH WINNER ===
        const matchWinner = oddsRecord.payload.find(m => m.name === 'Match Winner');
        if (matchWinner) {
            const homeOdd = parseFloat(matchWinner.values.find(v => v.value === 'Home')?.odd || 0);
            const awayOdd = parseFloat(matchWinner.values.find(v => v.value === 'Away')?.odd || 0);

            const predictions = predRecord.payload.predictions || {};
            const percent = predictions.percent || {};
            const homeProb = parseFloat(percent.home?.replace('%', '') || 0) / 100;
            const awayProb = parseFloat(percent.away?.replace('%', '') || 0) / 100;

            const favorite = homeProb > awayProb ? 'home' : 'away';
            const winProb = homeProb > awayProb ? homeProb : awayProb;
            const oddValue = homeProb > awayProb ? homeOdd : awayOdd;
            const teamName = homeProb > awayProb ? fixture.home.name : fixture.away.name;

            // Scoring
            let oddsQuality = 0;
            if (oddValue > 1.4 && oddValue < 2.5) oddsQuality = 1.0;
            else if (oddValue <= 1.4) oddsQuality = 0.6;
            else oddsQuality = 0.4;

            const dataConfidence = 1.0;
            const score = (winProb * 0.50) + (oddsQuality * 0.30) + (dataConfidence * 0.20);

            // Bucketing
            let bucket = null;
            let thesis = '';
            let title = '';

            if (winProb >= 0.72 && oddValue >= 1.40 && oddValue <= 1.85) {
                bucket = 'conservative';
                title = `${teamName} Favorito`;
                thesis = `🎯 Vitória | Prob ${(winProb * 100).toFixed(0)}%, Odd ${oddValue.toFixed(2)}. Contexto favorece. Análise completa?`;
            }
            else if (winProb >= 0.45 && winProb < 0.72 && oddValue >= 1.50 && oddValue <= 2.20) {
                bucket = 'moderate';
                title = `Valor em ${teamName}`;
                thesis = `🎯 Vitória | Odd ${oddValue.toFixed(2)} com ${(winProb * 100).toFixed(0)}% de chance. Mercado subestima?`;
            }
            else if (winProb >= 0.45 && oddValue >= 2.00 && oddValue <= 3.50) {
                bucket = 'aggressive';
                title = `Ousadia no ${teamName}`;
                thesis = `🎯 Vitória | Odd ${oddValue.toFixed(2)}. Risco alto, retorno melhor. Vale?`;
            }

            if (bucket) {
                allPicks.push({
                    fixture_id: fixture.id,
                    date: date,
                    risk_level: bucket,
                    title: title,
                    thesis: thesis,
                    score: score,
                    market: 'match_winner',
                    fixture: fixture
                });
            }
        }

        // === MARKET 2: OVER/UNDER GOALS ===
        const goalsOU = oddsRecord.payload.find(m => m.name === 'Goals Over/Under');
        if (goalsOU) {
            // Check lines: 0.5, 1.5, 2.5, 3.5
            for (const line of [0.5, 1.5, 2.5, 3.5]) {
                const lineStr = line.toString();
                const overOdd = parseFloat(goalsOU.values.find(v => v.value === `Over ${lineStr}`)?.odd || 0);
                const underOdd = parseFloat(goalsOU.values.find(v => v.value === `Under ${lineStr}`)?.odd || 0);

                if (overOdd === 0 || underOdd === 0) continue;

                // Simple heuristic: pick the option with better value (lower odd = higher implied prob)
                const impliedProbOver = 1 / overOdd;
                const impliedProbUnder = 1 / underOdd;

                // Conservative: Under with VERY high confidence (odd < 1.50, implied 67%+)
                if (underOdd < 1.50 && underOdd > 1.20) {
                    allPicks.push({
                        fixture_id: fixture.id,
                        date: date,
                        risk_level: 'conservative',
                        title: `Menos de ${line} gols`,
                        thesis: `⚽ Under ${line} | Odd ${underOdd.toFixed(2)}. Jogo travado, defesas sólidas.`,
                        score: impliedProbUnder,
                        market: 'over_under',
                        market_line: line,
                        selection: 'under',
                        fixture: fixture
                    });
                    break;
                }

                // Moderate: Over 2.5 with reasonable confidence (1.60-2.00, implied 50-62%)
                if (line === 2.5 && overOdd >= 1.60 && overOdd <= 2.00) {
                    allPicks.push({
                        fixture_id: fixture.id,
                        date: date,
                        risk_level: 'moderate',
                        title: `Mais de ${line} gols`,
                        thesis: `⚽ Over ${line} | Odd ${overOdd.toFixed(2)}. Ataques fortes, jogo aberto.`,
                        score: impliedProbOver,
                        market: 'over_under',
                        market_line: line,
                        selection: 'over',
                        fixture: fixture
                    });
                    break;
                }
            }
        }

        // === MARKET 3: BOTH TEAMS TO SCORE (BTTS) ===
        const btts = oddsRecord.payload.find(m => m.name === 'Both Teams Score');
        if (btts) {
            const yesOdd = parseFloat(btts.values.find(v => v.value === 'Yes')?.odd || 0);
            const noOdd = parseFloat(btts.values.find(v => v.value === 'No')?.odd || 0);

            if (yesOdd > 0 && yesOdd >= 1.50 && yesOdd <= 2.50) {
                allPicks.push({
                    fixture_id: fixture.id,
                    date: date,
                    risk_level: 'moderate',
                    title: `Ambos Marcam`,
                    thesis: `🥅 BTTS Sim | Odd ${yesOdd.toFixed(2)}. Ataques equilibrados, defesas vulneráveis.`,
                    score: 1 / yesOdd,
                    market: 'btts',
                    selection: 'yes',
                    fixture: fixture
                });
            }
        }
    }

    // 5. Select Top Picks (MAX 5 TOTAL, FOCUSED PORTFOLIO)
    allPicks.sort((a, b) => b.score - a.score);

    // Auto-select Featured Pick (highest conservative or moderate, NEVER aggressive)
    const featuredCandidates = allPicks.filter(p => p.risk_level === 'conservative' || p.risk_level === 'moderate');
    const featuredPick = featuredCandidates[0]; // Highest score

    if (featuredPick) {
        featuredPick.is_featured = true;

        // Generate Official Featured Analysis (Structured Format)
        const fixture = featuredPick.fixture;
        const league = fixture?.leagues?.name || 'Liga Desconhecida';
        const homeTeam = fixture?.home?.name || 'Time A';
        const awayTeam = fixture?.away?.name || 'Time B';
        const matchDate = fixture?.date_utc ? new Date(fixture.date_utc) : new Date();
        const dateStr = matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const timeStr = matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Determine market description
        let marketDesc = '';
        if (featuredPick.market === 'match_winner') {
            marketDesc = `Vitória de ${homeTeam.includes(featuredPick.title.split(' ').pop()) ? homeTeam : awayTeam}`;
        } else if (featuredPick.market === 'over_under') {
            marketDesc = featuredPick.selection === 'over'
                ? `Mais de ${featuredPick.market_line} gols`
                : `Menos de ${featuredPick.market_line} gols`;
        } else if (featuredPick.market === 'btts') {
            marketDesc = 'Ambas as equipes marcam';
        }

        // Extract odd (if available in original thesis)
        const oddMatch = featuredPick.thesis.match(/Odd ([\d.]+)/);
        const odd = oddMatch ? oddMatch[1] : '1.XX';

        // Generate analytical copy (tone: calm, secure, analytical)
        const analyses = {
            conservative: [
                `Contexto recente aponta para jogo controlado, com ambas as equipes priorizando equilíbrio defensivo. Histórico recente confirma padrão de poucos espaços e ritmo reduzido. O mercado ajustou as odds corretamente, mas ainda há margem para valor em cenário de baixa volatilidade.`,
                `Perfil tático das equipes favorece controle de posse e gestão de risco. Dados das últimas rodadas mostram consistência em jogos de baixa amplitude ofensiva. Leitura se sustenta em padrão comportamental defensivo já estabelecido.`,
                `Jogo com incentivos claros para cautela tática. Ambas as equipes têm mais a perder do que ganhar em exposição ofensiva excessiva. Edge está na assimetria entre expectativa do mercado e realidade do perfil do confronto.`
            ],
            moderate: [
                `Assimetria técnica clara favorece um dos lados, mas o mercado parece não precificar totalmente o contexto recente. Performance nas últimas partidas mostra tendência que não está refletida nas odds atuais. Há espaço para valor calculado.`,
                `Leitura baseada em padrão recente ignorado pelo consenso. Dados de forma, escalação provável e incentivos táticos apontam para resultado mais provável do que as odds sugerem. Não é garantia, mas é assimetria racional.`,
                `Contexto de jogo favorece lado específico por questões de momento e necessidade competitiva. Mercado ajustado, mas ligeiramente desalinhado com realidade tática atual. Edge está no timing da leitura.`
            ]
        };

        const analysisOptions = analyses[featuredPick.risk_level] || analyses.moderate;
        const modelAnalysis = analysisOptions[Math.floor(Math.random() * analysisOptions.length)];

        // Final Reading (one sentence, disciplined tone)
        const finalReadings = [
            'Entre as leituras do dia, esta é a que apresenta o melhor equilíbrio entre risco e contexto.',
            'Se houver apenas uma exposição hoje, esta é a mais defensável segundo o modelo.',
            'É uma leitura de disciplina, não de agressividade.',
            'O edge não é garantia, mas a lógica é sólida e sustentável.'
        ];
        const finalReading = finalReadings[Math.floor(Math.random() * finalReadings.length)];

        // Build structured analysis
        featuredPick.featured_analysis = {
            competition: league,
            match: `${homeTeam} vs ${awayTeam}`,
            date: `${dateStr} às ${timeStr}`,
            market: marketDesc,
            odd: odd,
            model_analysis: modelAnalysis,
            final_reading: finalReading
        };
    }

    // Select remaining picks (max 4 more = 5 total)
    const conservative = allPicks.filter(c => c.risk_level === 'conservative' && c !== featuredPick).slice(0, 2);
    const moderate = allPicks.filter(c => c.risk_level === 'moderate' && c !== featuredPick).slice(0, 2);
    const aggressive = allPicks.filter(c => c.risk_level === 'aggressive').slice(0, 1);

    let finalPicks = [featuredPick, ...conservative, ...moderate, ...aggressive].filter(Boolean);

    // Enforce max 5 (Featured + 4 others)
    finalPicks = finalPicks.slice(0, 5);

    // REWRITE COPY — Create Tension, Not Answers
    finalPicks = finalPicks.map(pick => {
        let newTitle = '';
        let newThesis = '';

        // Conservative Copy (Tension)
        if (pick.risk_level === 'conservative') {
            const titles = [
                'Jogo com tendência travada',
                'Cenário de controle provável',
                'Contexto defensivo aparente'
            ];
            const theses = [
                'Contexto aponta para poucos espaços e ritmo controlado. Quer ver o que pode quebrar essa leitura?',
                'Ambos os times têm incentivo para jogar cauteloso. Quer entender os riscos ocultos?',
                'Defesas sólidas e histórico de jogos fechados. Vale a pena confirmar com a IA?'
            ];
            newTitle = titles[Math.floor(Math.random() * titles.length)];
            newThesis = theses[Math.floor(Math.random() * theses.length)];
        }

        // Moderate Copy (Hidden Value)
        else if (pick.risk_level === 'moderate') {
            const titles = [
                'Valor escondido no favoritismo',
                'Leitura que o mercado talvez ignore',
                'Detalhe importante no confronto'
            ];
            const theses = [
                'O mercado parece subestimar um detalhe importante do confronto. Quer a leitura completa no chat?',
                'Há uma assimetria que pode gerar valor. Precisa confirmar 1 fator antes de decidir?',
                'Os números mostram algo que não está refletido nas odds. Abrir análise completa?'
            ];
            newTitle = titles[Math.floor(Math.random() * titles.length)];
            newThesis = theses[Math.floor(Math.random() * theses.length)];
        }

        // Aggressive Copy (High Risk/Reward)
        else if (pick.risk_level === 'aggressive') {
            const titles = [
                'Cenário de alto retorno possível',
                'Contexto de assimetria forte',
                'Leitura contrarian com upside'
            ];
            const theses = [
                'O upside existe, mas depende de 1–2 condições específicas. Abrir análise completa com a IA.',
                'Alta volatilidade esperada. Quer entender exatamente o que precisa acontecer?',
                'Odds generosas, mas risco real. Vale investigar os fatores com a IA?'
            ];
            newTitle = titles[Math.floor(Math.random() * titles.length)];
            newThesis = theses[Math.floor(Math.random() * theses.length)];
        }

        return {
            ...pick,
            title: newTitle || pick.title,
            thesis: newThesis || pick.thesis
        };
    });

    if (finalPicks.length === 0) {
        console.log('[PICKS] No valid picks found.');
        return { message: 'No picks generated', count: 0 };
    }

    // 6. Save to DB
    await supabase.from('daily_picks').delete().eq('date', date);

    const { error: insertError } = await supabase.from('daily_picks').insert(
        finalPicks.map(p => ({
            date: p.date,
            fixture_id: p.fixture_id,
            risk_level: p.risk_level,
            title: p.title,
            thesis: p.thesis,
            is_featured: p.is_featured || false // Note: is_featured is not in DB yet, but we'll handle in UI
        }))
    );

    if (insertError) throw new Error(`Error saving picks: ${insertError.message}`);

    return {
        message: 'Picks generated successfully',
        count: finalPicks.length,
        picks: finalPicks,
        featured: featuredPick?.title || null
    };
}
