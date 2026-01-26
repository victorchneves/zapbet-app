import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, MessageSquare, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PaywallModal from '../components/modals/PaywallModal';

export default function DailyPicks() {
    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const loadData = async () => {
            const today = new Date().toISOString().split('T')[0];

            // 1. Load Picks
            const { data: picksData } = await supabase
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
                .order('risk_level', { ascending: true });

            setPicks(picksData || []);

            // 2. Check Subscription
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('subscription_status')
                    .eq('id', user.id)
                    .single();
                setIsPremium(profile?.subscription_status === 'premium');
            }

            setLoading(false);
        };
        loadData();
    }, [user]);

    const getRiskBadge = (level, isFeatured) => {
        if (isFeatured) {
            return { icon: '⭐', color: 'bg-primary/20 text-primary', label: 'Leitura Principal' };
        }
        const badges = {
            conservative: { icon: '🛡️', color: 'bg-green-500/20 text-green-400', label: 'Confiança Alta' },
            moderate: { icon: '', color: 'bg-yellow-500/20 text-yellow-400', label: 'Valor Potencial' },
            aggressive: { icon: '🔥', color: 'bg-red-500/20 text-red-400', label: 'Alto Risco' }
        };
        return badges[level] || badges.moderate;
    };

    // Shared Header Component
    const PageHeader = () => (
        <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold text-white">Leituras do Dia</h1>
            </div>
            <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => navigate('/')}
            >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat IA
            </Button>
        </header>
    );

    const renderLockedPick = (label = "Leitura Bloqueada", subtitle = "Exclusivo Premium") => (
        <div className="relative bg-card border border-border rounded-xl p-5 overflow-hidden group">
            {/* Blurred Content */}
            <div className="filter blur-md opacity-40 pointer-events-none select-none">
                <div className="flex justify-between mb-3">
                    <div className="h-4 bg-white/20 rounded w-20"></div>
                    <div className="h-4 bg-white/20 rounded w-8"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-6 bg-white/20 rounded w-3/4"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                </div>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] transition-colors group-hover:bg-black/70">
                <div className="bg-background/80 p-3 rounded-full mb-3 border border-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{label}</h4>
                <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
                <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs h-8"
                    onClick={() => setShowPaywall(true)}
                >
                    Desbloquear Acesso
                </Button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 pb-20">
                <PageHeader />
                <div className="text-center p-8 text-muted-foreground">Carregando leituras...</div>
            </div>
        );
    }

    if (picks.length === 0) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 pb-20">
                <PageHeader />
                <div className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
                    <h3 className="text-white font-bold text-lg">Curadoria em andamento</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        O ZapBet analisa dezenas de jogos diariamente. Apenas as leituras que passam no critério de confiança do modelo são exibidas aqui.
                    </p>
                </div>
            </div>
        );
    }

    const featuredPick = picks[0];
    const secondaryPicks = picks.slice(1).filter(p => p.risk_level !== 'aggressive');
    const aggressivePicks = picks.slice(1).filter(p => p.risk_level === 'aggressive');

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-20">
            <PageHeader />

            <div className="space-y-8">
                {/* FEATURED PICK */}
                {featuredPick && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                            🔥 Leitura Principal {isPremium && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px]">PREMIUM</span>}
                        </h2>

                        {!isPremium ? (
                            // LOCKED STATE
                            <div className="relative bg-gradient-to-br from-card to-card/50 border-2 border-primary/30 rounded-xl p-5 min-h-[300px] overflow-hidden">
                                <div className="filter blur-md select-none pointer-events-none opacity-40">
                                    <div className="space-y-4">
                                        <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                                            Competição
                                        </div>
                                        <div className="text-lg font-bold text-white">
                                            Time A vs Time B
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-white/10 rounded w-3/4"></div>
                                            <div className="h-3 bg-white/10 rounded w-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-6 text-center">
                                    <Lock className="w-14 h-14 text-primary mb-4" />
                                    <h4 className="text-white font-bold text-xl mb-2">Leitura Principal Bloqueada</h4>
                                    <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
                                        A análise mais forte do dia. Desbloqueie para ver a tese completa, odds e contexto.
                                    </p>
                                    <Button onClick={() => setShowPaywall(true)} className="bg-primary hover:bg-primary/90 font-bold w-full">
                                        Liberar Agora
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // UNLOCKED STATE
                            <div className="bg-gradient-to-br from-card to-card/50 border-2 border-primary/40 rounded-xl p-5 space-y-4 shadow-lg shadow-primary/5">
                                <div className={`${getRiskBadge(featuredPick.risk_level, true).color} px-3 py-1 rounded-full text-xs font-bold uppercase inline-block`}>
                                    {getRiskBadge(featuredPick.risk_level, true).label}
                                </div>

                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                                        {featuredPick.fixtures?.leagues?.name || 'League'}
                                    </div>
                                    <div className="text-lg font-bold text-white">
                                        {featuredPick.fixtures?.home?.name} vs {featuredPick.fixtures?.away?.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(featuredPick.fixtures?.date_utc), "dd/MM 'às' HH:mm")}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white leading-tight">
                                        {featuredPick.title}
                                    </h3>
                                    <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                        <p className="text-sm text-gray-300 leading-relaxed italic">
                                            "{featuredPick.thesis}"
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12"
                                    onClick={() => navigate('/', {
                                        state: {
                                            query: `Análise completa: ${featuredPick.title}. ${featuredPick.thesis}`,
                                            fixtureId: featuredPick.fixtures?.id
                                        }
                                    })}
                                >
                                    👉 Discutir com IA
                                </Button>
                            </div>
                        )}
                    </section>
                )}

                {/* SECONDARY PICKS */}
                {secondaryPicks.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">📊 Outras Leituras</h2>
                        <div className="space-y-3">
                            {secondaryPicks.map((pick, index) => {
                                // FREE USER LOGIC: Only show first secondary pick (index 0). Lock rest.
                                const isLocked = !isPremium && index > 0;

                                if (isLocked) return <div key={pick.id}>{renderLockedPick("Leitura Extra", "Plano Premium")}</div>;

                                const badge = getRiskBadge(pick.risk_level, false);
                                return (
                                    <div
                                        key={pick.id}
                                        className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors cursor-pointer relative overflow-hidden"
                                        onClick={() => navigate('/', {
                                            state: {
                                                query: `Análise: ${pick.title}. ${pick.thesis}`,
                                                fixtureId: pick.fixtures?.id
                                            }
                                        })}
                                    >
                                        {!isPremium && index === 0 && (
                                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl-lg">
                                                GRÁTIS
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 space-y-1">
                                                <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                                                    {pick.fixtures?.leagues?.name || 'League'}
                                                </div>
                                                <div className="font-bold text-white text-sm">
                                                    {pick.fixtures?.home?.name} vs {pick.fixtures?.away?.name}
                                                </div>
                                            </div>
                                            <div className={`${badge.color} px-2 py-1 rounded text-xs font-bold`}>
                                                {badge.icon}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-white mb-1">{pick.title}</h4>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{pick.thesis}</p>
                                        </div>

                                        <div className="text-primary text-xs font-medium flex items-center gap-1">
                                            Abrir análise <span>→</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* AGGRESSIVE PICKS */}
                {aggressivePicks.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">⚠️ Cenário Agressivo</h2>
                        {aggressivePicks.map((pick) => {
                            // Lock all aggressive picks for free users? Or allow 1? 
                            // Usually aggressive are deeper. Let's lock all aggressive if Free.
                            // Or consistent with above: lock everything not included in "1 secondary".
                            // Let's lock ALL aggressive for free users to upsell.
                            if (!isPremium) return <div key={pick.id}>{renderLockedPick("Leitura Agressiva", "Alto Risco & Retorno")}</div>;

                            return (
                                <div
                                    key={pick.id}
                                    className="bg-card border-2 border-red-500/30 rounded-xl p-4 space-y-3 hover:border-red-500/50 transition-colors cursor-pointer"
                                    onClick={() => navigate('/', {
                                        state: {
                                            query: `Análise de risco: ${pick.title}. ${pick.thesis}`,
                                            fixtureId: pick.fixtures?.id
                                        }
                                    })}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 space-y-1">
                                            <div className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded inline-block">
                                                {pick.fixtures?.leagues?.name || 'League'}
                                            </div>
                                            <div className="font-bold text-white text-sm">
                                                {pick.fixtures?.home?.name} vs {pick.fixtures?.away?.name}
                                            </div>
                                        </div>
                                        <div className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold">
                                            🔥 Alto Risco
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-white mb-1">{pick.title}</h4>
                                        <p className="text-xs text-muted-foreground">{pick.thesis}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                {!isPremium && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center space-y-3">
                        <p className="text-sm text-white">
                            Você está vendo apenas uma amostra grátis.
                        </p>
                        <Button
                            className="bg-primary hover:bg-primary/90 w-full"
                            onClick={() => setShowPaywall(true)}
                        >
                            Ver Todas as Leituras
                        </Button>
                    </div>
                )}
            </div>

            <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                context="daily_picks_page"
            />
        </div>
    );
}
