import { useEffect, useState } from 'react';
import { fetchTodayFixtures } from '../../services/dataService';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function TopGamesWidget() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            const { fixtures } = await fetchTodayFixtures();
            // For MVP, if no specific "Daily Top Games" endpoint exists yet that filters IDs,
            // we just take the top 3 fixtures from 'today'. 
            // In a real scenario, we'd fetch 'daily_top_games' table first then map.
            // Assuming 'today' returns prioritized or we just take first 3 for now.
            setGames(fixtures ? fixtures.slice(0, 3) : []);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <div className="p-4 text-center text-muted-foreground animate-pulse">Carregando jogos...</div>;

    return (
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Games do Dia</h3>
                <Button variant="link" className="text-xs text-primary p-0 h-auto" onClick={() => navigate('/top-games')}>Ver todos</Button>
            </div>

            {games.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
                    Nenhum jogo em destaque hoje.
                </div>
            ) : (
                <div className="space-y-3">
                    {games.map(game => (
                        <div key={game.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{game.leagues?.name || 'Liga'}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(game.date_utc), 'HH:mm')}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3 text-sm">
                                <div className="font-bold text-white flex items-center gap-2">
                                    {/* Logo placeholder if broken */}
                                    <span className="truncate max-w-[100px]">{game.home?.name || 'Home'}</span>
                                </div>
                                <span className="text-muted-foreground text-xs px-2">vs</span>
                                <div className="font-bold text-white flex items-center gap-2">
                                    <span className="truncate max-w-[100px]">{game.away?.name || 'Away'}</span>
                                </div>
                            </div>
                            <button
                                className="w-full py-2 bg-secondary/50 rounded-lg text-sm font-medium hover:bg-secondary transition-colors text-white"
                                onClick={() => navigate(`/game/${game.id}`)}
                            >
                                Analisar com IA
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
