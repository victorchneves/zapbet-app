import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/button';
import { Lock, Radio, RefreshCw } from 'lucide-react';
import PaywallModal from '../modals/PaywallModal';
import { useTranslation } from 'react-i18next';

export default function LiveGamesWidget() {
    const { t } = useTranslation();
    const [games, setGames] = useState([]);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLive = useCallback(async () => {
        setRefreshing(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setRefreshing(false);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/live/games', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();

            if (data.locked) {
                setLocked(true);
            } else {
                setLocked(false);
                setGames(data.games || []);
            }
        } catch (error) {
            console.error('Live fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLive();
    }, [fetchLive]);

    if (loading) return (
        <section className="space-y-3 opacity-50 animate-pulse">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> {t('live')}
            </h3>
            <div className="h-20 bg-card rounded-xl"></div>
        </section>
    );

    // STATE: LOCKED (Free User)
    if (locked) {
        return (
            <section className="space-y-3 relative group cursor-pointer" onClick={() => setShowPaywall(true)}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {t('live')}
                    </h3>
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Lock size={10} /> {t('premium')}
                    </span>
                </div>

                {/* Blurred Content */}
                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 filter blur-[2px] opacity-70 select-none">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{t('home_team')}</span>
                            <span className="text-primary font-mono font-bold">1 - 0</span>
                            <span className="font-bold text-white">{t('away_team')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{t('home_team')}</span>
                            <span className="text-primary font-mono font-bold">2 - 1</span>
                            <span className="font-bold text-white">{t('away_team')}</span>
                        </div>
                    </div>
                </div>

                {/* Lock Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 top-6">
                    <div className="bg-background/90 backdrop-blur-sm p-3 rounded-full border border-primary/30 shadow-lg mb-2 group-hover:scale-110 transition-transform">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                        {t('tap_to_unlock')}
                    </span>
                </div>

                <PaywallModal
                    isOpen={showPaywall}
                    onClose={() => setShowPaywall(false)}
                    context="live_games"
                />
            </section>
        );
    }

    // STATE: ACTIVE (Premium User)
    return (
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> {t('live')}
                </h3>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-white"
                    onClick={fetchLive}
                    disabled={refreshing}
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </Button>
            </div>

            {games.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
                    {t('no_live_games')}
                </div>
            ) : (
                <div className="space-y-2">
                    {games.map(game => (
                        <div key={game.id} className="bg-card border border-border rounded-xl p-3 flex justify-between items-center relative overflow-hidden">
                            {/* Live Indicator Bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>

                            <div className="flex-1 ml-2">
                                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">
                                    {game.league} • {game.time}'
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center pr-2">
                                        <span className="font-bold text-white text-sm">{game.home.name}</span>
                                        <span className="font-mono font-bold text-primary">{game.home.goals}</span>
                                    </div>
                                    <div className="flex justify-between items-center pr-2">
                                        <span className="font-bold text-white text-sm">{game.away.name}</span>
                                        <span className="font-mono font-bold text-primary">{game.away.goals}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
