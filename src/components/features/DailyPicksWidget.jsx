import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import PaywallModal from '../modals/PaywallModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DailyPicksWidget() {
    const { t } = useTranslation();
    const [featuredPick, setFeaturedPick] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const loadPicks = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('daily_picks')
                .select(`
                    *,
                    fixtures(
                        id, 
                        date_utc,
                        home:teams!home_team_id(name),
                        away:teams!away_team_id(name),
                        leagues(name)
                    )
                `)
                .eq('date', today)
                .order('risk_level', { ascending: true })
                .limit(1);

            const { count } = await supabase
                .from('daily_picks')
                .select('*', { count: 'exact', head: true })
                .eq('date', today);

            // Check subscription status
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_status')
                    .eq('id', user.id)
                    .single();

                setIsPremium(profile?.subscription_status === 'premium');
            }

            setFeaturedPick(data?.[0] || null);
            setTotalCount(count || 0);
            setLoading(false);
        };
        loadPicks();
    }, [user]);

    if (loading) return null;

    if (!featuredPick) return (
        <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('daily_pick')}</h3>
            <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
                <p className="text-sm text-white font-medium">
                    {t('analyzing_scenes')}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('edge_explanation')}
                </p>
            </div>
        </section>
    );

    const fixture = featuredPick.fixtures;

    // FREE USERS: Show locked Featured Pick
    if (!isPremium) {
        return (
            <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('featured_pick')}</h3>

                <div className="relative bg-gradient-to-br from-card to-card/50 border-2 border-primary/30 rounded-xl p-5 min-h-[300px] overflow-hidden">
                    {/* Blurred Background */}
                    <div className="filter blur-md select-none pointer-events-none opacity-40">
                        <div className="space-y-4">
                            <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                                {t('featured_pick_label')}
                            </div>
                            <div className="text-lg font-bold text-white">
                                {fixture?.home?.name} vs {fixture?.away?.name}
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 bg-white/10 rounded w-3/4"></div>
                                <div className="h-3 bg-white/10 rounded w-full"></div>
                                <div className="h-3 bg-white/10 rounded w-2/3"></div>
                            </div>
                        </div>
                    </div>

                    {/* Lock Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-6">
                        <Lock className="w-14 h-14 text-primary mb-4" />
                        <h4 className="text-white font-bold text-xl mb-2">{t('featured_pick_label')}</h4>
                        <p className="text-sm text-muted-foreground text-center max-w-xs mb-6 leading-relaxed">
                            {t('conservative_risk')}
                        </p>
                        <Button
                            onClick={() => setShowPaywall(true)}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {t('unlock_featured')}
                        </Button>
                    </div>
                </div>

                {totalCount > 1 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-primary hover:bg-primary/10 text-xs"
                        onClick={() => navigate('/picks')}
                    >
                        {t('view_free_pick')}
                    </Button>
                )}

                <PaywallModal
                    isOpen={showPaywall}
                    onClose={() => setShowPaywall(false)}
                    context="featured_pick"
                />
            </section>
        );
    }

    // PREMIUM USERS: Full Featured Pick
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('featured_pick')}</h3>

            <div className="bg-gradient-to-br from-card to-card/50 border-2 border-primary/30 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                    <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block uppercase tracking-wider">
                        {t('featured_pick_label')}
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium text-white">{t('competition')}</span> {fixture?.leagues?.name || 'Liga'}
                        </div>
                        <div className="text-lg font-bold text-white">
                            {fixture?.home?.name} vs {fixture?.away?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {new Date(fixture?.date_utc).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(fixture?.date_utc).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 text-sm">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('market')}</div>
                        <div className="font-bold text-white">{featuredPick.title}</div>
                    </div>
                    <div className="border-l border-border pl-4">
                        <div className="text-xs text-muted-foreground mb-1">{t('odd')}</div>
                        <div className="font-mono font-bold text-primary">
                            {featuredPick.thesis.match(/Odd ([\d.]+)/)?.[1] || '—'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {t('model_analysis')}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {featuredPick.thesis.split('|')[1]?.trim() || featuredPick.thesis}
                    </p>
                </div>

                <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-primary/90 italic leading-relaxed">
                        {featuredPick.risk_level === 'conservative'
                            ? t('conservative_risk')
                            : t('aggressive_risk')}
                    </p>
                </div>

                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    onClick={() => navigate('/', {
                        state: {
                            query: `Análise completa da leitura principal: ${featuredPick.title} no jogo ${fixture?.home?.name} vs ${fixture?.away?.name}`,
                            fixtureId: fixture?.id
                        }
                    })}
                >
                    {t('deep_dive_ai')}
                </Button>
            </div>

            {totalCount > 1 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary hover:bg-primary/10 text-xs"
                    onClick={() => navigate('/picks')}
                >
                    {t('view_all_picks')} ({totalCount})
                </Button>
            )}
        </section>
    );
}
