import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function DailyPicks() {
    const [picks, setPicks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
                .order('risk_level', { ascending: true });

            setPicks(data || []);
            setLoading(false);
        };
        loadPicks();
    }, []);

    const getRiskBadge = (level, isFeatured) => {
        if (isFeatured) {
            return { icon: '⭐', color: 'bg-primary/20 text-primary', label: 'Leitura Principal' };
        }
        const badges = {
            conservative: { icon: '🛡️', color: 'bg-green-500/20 text-green-400', label: 'Confiança Alta' },
            moderate: { icon: '⚖️', color: 'bg-yellow-500/20 text-yellow-400', label: 'Valor Potencial' },
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
                    <p className="text-xs text-muted-foreground">
                        Menos sinais. Mais precisão.
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

            <div className="space-y-6">
                {/* FEATURED PICK */}
                {featuredPick && (
                    <section className="space-y-2">
                        <h2 className="text-xs font-bold text-primary uppercase tracking-wider">🔥 Leitura Principal</h2>
                        <div className="bg-gradient-to-br from-card to-card/50 border-2 border-primary/40 rounded-xl p-5 space-y-4">
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
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {featuredPick.thesis}
                                </p>
                            </div>

                            <p className="text-xs text-primary/70 italic">
                                Se você olhar só uma leitura hoje, é essa.
                            </p>

                            <Button
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                onClick={() => navigate('/', {
                                    state: {
                                        query: `Análise completa: ${featuredPick.title}. ${featuredPick.thesis}`,
                                        fixtureId: featuredPick.fixtures?.id
                                    }
                                })}
                            >
                                👉 Analisar com IA
                            </Button>
                        </div>
                    </section>
                )}

                {/* SECONDARY PICKS */}
                {secondaryPicks.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">📊 Outras Leituras do Dia</h2>
                        <div className="space-y-3">
                            {secondaryPicks.map((pick) => {
                                const badge = getRiskBadge(pick.risk_level, false);
                                return (
                                    <div
                                        key={pick.id}
                                        className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors cursor-pointer"
                                        onClick={() => navigate('/', {
                                            state: {
                                                query: `Análise: ${pick.title}. ${pick.thesis}`,
                                                fixtureId: pick.fixtures?.id
                                            }
                                        })}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 space-y-1">
                                                <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block">
                                                    {pick.fixtures?.leagues?.name || 'League'}
                                                </div>
                                                <div className="font-bold text-white text-sm">
                                                    {pick.fixtures?.home?.name} vs {pick.fixtures?.away?.name}
                                                </div>
                                            </div>
                                            <div className={`${badge.color} px-2 py-1 rounded text-xs font-bold whitespace-nowrap`}>
                                                {badge.icon}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-white mb-1">{pick.title}</h4>
                                            <p className="text-xs text-muted-foreground">{pick.thesis}</p>
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
                        {aggressivePicks.map((pick) => (
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

                                <div className="text-red-400 text-xs font-medium flex items-center gap-1">
                                    Entender os riscos <span>→</span>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* GLOBAL CTA */}
                <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => navigate('/', {
                        state: {
                            query: `Analise todas as leituras do dia: ${picks.map(p => p.title).join(', ')}`
                        }
                    })}
                >
                    👉 Analisar Palpites com IA
                </Button>
            </div>
        </div>
    );
}
