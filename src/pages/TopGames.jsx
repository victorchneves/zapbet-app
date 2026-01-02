import { useEffect, useState } from 'react';
import { fetchTodayFixtures, fetchUpcomingFixtures } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';

export default function TopGames() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            // Fetching both for MVP demo list
            const today = await fetchTodayFixtures();
            const upcoming = await fetchUpcomingFixtures();

            const allGames = [
                ...(today.fixtures || []),
                ...(upcoming.fixtures || [])
            ].sort((a, b) => new Date(a.date_utc) - new Date(b.date_utc));

            setGames(allGames);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-20">
            <header className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>←</Button>
                <h1 className="text-xl font-bold text-white">Próximos Jogos</h1>
            </header>

            {loading ? (
                <div className="text-center p-8 text-muted-foreground">Carregando jogos...</div>
            ) : (
                <div className="space-y-4">
                    {games.map(game => (
                        <div key={game.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center cursor-pointer hover:border-primary/50" onClick={() => navigate(`/game/${game.id}`)}>
                            <div className="flex-1">
                                <div className="text-xs text-muted-foreground mb-1">{format(new Date(game.date_utc), 'dd/MM HH:mm')} • {game.leagues?.name}</div>
                                <div className="font-bold text-white">{game.home?.name} vs {game.away?.name}</div>
                            </div>
                            <Button size="sm" variant="secondary" className="text-xs">
                                Analisar
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
