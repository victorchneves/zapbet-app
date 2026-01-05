import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/button';
import { Send, Menu, LogOut, User, Bot, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import FormattedMessage from '../components/ui/FormattedMessage';
import { cn } from '../lib/utils';
import PushToggle from '../components/features/PushToggle';
import PaywallModal from '../components/modals/PaywallModal';

export default function Chat() {
    const { user, signOut } = useAuth();
    // ... existing imports
    const [dailyStatus, setDailyStatus] = useState({ used: false, fixtureId: null, label: '' });

    // ... existing useEffects

    // [NEW] Check Daily Usage
    useEffect(() => {
        if (!user) return;

        const checkUsage = async () => {
            // Check if Premium
            const { data: profile } = await supabase
                .from('profiles')
                .select('subscription_status')
                .eq('id', user.id)
                .single();

            if (profile?.subscription_status === 'premium') {
                setDailyStatus({ type: 'premium' });
                return;
            }

            // 1. Check Unlocked Fixtures (Simple Query, no Join)
            const today = new Date().toISOString().split('T')[0];
            const { data: unlocked } = await supabase
                .from('daily_unlocked_fixtures')
                .select('fixture_id')
                .eq('user_id', user.id)
                .eq('date', today)
                .single(); // Limit 1 per day

            if (unlocked) {
                // 2. Fetch Fixture Details Manually (Bypass FK cache issue)
                const { data: fixture } = await supabase
                    .from('fixtures')
                    .select('home:teams!home_team_id(name), away:teams!away_team_id(name)')
                    .eq('id', unlocked.fixture_id)
                    .single();

                const home = fixture?.home?.name || 'Time A';
                const away = fixture?.away?.name || 'Time B';

                setDailyStatus({
                    type: 'used',
                    fixtureId: unlocked.fixture_id,
                    label: `${home} vs ${away}`
                });
            } else {
                setDailyStatus({ type: 'available' });
            }
        };
        checkUsage();
    }, [user]);

    // ... existing event handlers

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
                {/* ... existing header content ... */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-sm leading-tight">ZapBet IA</h1>
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <PushToggle />
                </div>
            </header>

            {/* [NEW] Daily Limit Banner */}
            {dailyStatus.type !== 'premium' && (
                <div className={cn(
                    "text-xs px-4 py-2 flex items-center justify-between shadow-sm",
                    dailyStatus.type === 'available' ? "bg-blue-500/10 text-blue-300 border-b border-blue-500/20" :
                        dailyStatus.type === 'used' ? "bg-green-500/10 text-green-300 border-b border-green-500/20" : ""
                )}>
                    {dailyStatus.type === 'available' && (
                        <>
                            <span className="flex items-center gap-2">
                                🎫 <b>Ficha Diária Disponível:</b> Escolha seu jogo com sabedoria.
                            </span>
                        </>
                    )}
                    {dailyStatus.type === 'used' && (
                        <>
                            <span className="flex items-center gap-2 truncate">
                                🟢 <b>Modo Grátis Ativo:</b> {dailyStatus.label}
                            </span>
                            <button onClick={() => setShowPaywall(true)} className="underline font-bold text-[10px] ml-2 shrink-0">
                                Trocar Jogo?
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Chat Area */}
            <main className="flex-1 p-4 overflow-y-auto w-full max-w-lg mx-auto space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-10 text-sm animate-in fade-in zoom-in duration-500">
                        <p className="mb-2">"O que tem hoje de interessante?"</p>
                        <p>"Quero algo agressivo hoje"</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                        "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                        msg.role === 'user' ? "flex-row-reverse" : ""
                    )}>
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                            msg.role === 'user'
                                ? "bg-secondary border-border"
                                : "bg-primary/10 border-primary/20"
                        )}>
                            {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-primary" />}
                        </div>

                        <div className={cn(
                            "rounded-2xl p-3 text-sm max-w-[85%] shadow-sm",
                            msg.role === 'user'
                                ? "bg-secondary text-white rounded-tr-sm"
                                : "bg-card border border-border text-gray-200 rounded-tl-sm"
                        )}>
                            {msg.role === 'user' ? (
                                <p>{msg.content}</p>
                            ) : (
                                <FormattedMessage content={msg.content} />
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Bot size={14} className="text-primary" />
                        </div>
                        <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 space-y-2 w-32">
                            <div className="h-2 bg-white/10 rounded w-full"></div>
                            <div className="h-2 bg-white/10 rounded w-2/3"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <footer className="p-4 bg-card/50 backdrop-blur-md border-t border-border sticky bottom-0">
                <form onSubmit={handleSubmit} className="max-w-lg mx-auto relative flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte sobre um jogo..."
                        disabled={isLoading}
                        className="flex-1 bg-secondary/50 border border-border text-white text-sm rounded-full px-4 py-3 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground transition-all"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={isLoading || !input.trim()}
                        className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20"
                    >
                        <Send size={18} />
                    </Button>
                </form>
            </footer>

            <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                context="chat_limit"
            />
        </div>
    );
}
