import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';

export default function DailyPicksWidget() {
    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadPicks = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('daily_picks')
                .select('*, fixtures(home_team_id, away_team_id)') // Simplified for now
                .eq('date', today)
                .limit(3);

            setPicks(data || []);
            setLoading(false);
        };
        loadPicks();
    }, []);

    if (loading) return null; // Silent load

    if (picks.length === 0) return (
        <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Picks do Dia</h3>
            <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
                Aguardando operações da IA...
            </div>
        </section>
    );

    return (
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Picks do Dia</h3>
                <Button variant="link" className="text-xs text-primary p-0 h-auto" onClick={() => navigate('/picks')}>Ver todas</Button>
            </div>

            <div className="space-y-3">
                {picks.map(pick => (
                    <div key={pick.id} className="bg-card border border-border rounded-xl p-4 relative overflow-hidden group hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate(`/game/${pick.fixture_id}`)}>
                        <div className={`absolute top-0 right-0 p-1.5 rounded-bl-lg text-[10px] font-bold uppercase ${pick.risk_level === 'aggressive' ? 'bg-red-500/20 text-red-400' :
                                pick.risk_level === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-green-500/20 text-green-400'
                            }`}>
                            {pick.risk_level}
                        </div>

                        <h4 className="font-bold text-white pr-16">{pick.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pick.thesis}</p>

                        <div className="mt-3 flex items-center text-primary text-xs font-bold gap-1 group-hover:gap-2 transition-all">
                            Abrir no Chat <span>→</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
