import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';

export default function DailyPicks() {
    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('daily_picks')
                .select('*')
                .order('date', { ascending: false })
                .limit(20);
            setPicks(data || []);
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-20">
            <header className="mb-6 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>←</Button>
                <h1 className="text-xl font-bold text-white">Daily Picks</h1>
            </header>

            {loading ? (
                <div className="text-center p-8 text-muted-foreground">Carregando picks...</div>
            ) : (
                <div className="space-y-4">
                    {picks.map(pick => (
                        <div key={pick.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50" onClick={() => navigate(`/game/${pick.fixture_id}`)}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-muted-foreground">{format(new Date(pick.date), 'dd/MM/yyyy')}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${pick.risk_level === 'aggressive' ? 'bg-red-500/20 text-red-500' :
                                        pick.risk_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-500' :
                                            'bg-green-500/20 text-green-500'
                                    }`}>{pick.risk_level}</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">{pick.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{pick.thesis}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
