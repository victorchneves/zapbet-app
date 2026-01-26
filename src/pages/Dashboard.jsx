import TopGamesWidget from '../components/features/TopGamesWidget';
import DailyPicksWidget from '../components/features/DailyPicksWidget';
import LiveGamesWidget from '../components/features/LiveGamesWidget';
import LanguageSwitcher from '../components/features/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MessageSquare, LogOut } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <header className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src="/zapbet-logo.png" alt="ZapBet Logo" className="h-8 w-8 rounded-full object-cover" />
                    <h1 className="text-2xl font-bold text-white">{t('dashboard')}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-white"
                        onClick={async () => {
                            await supabase.auth.signOut();
                            navigate('/login');
                        }}
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => navigate('/')}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {t('chat_ai')}
                    </Button>
                </div>
            </header>

            <div className="grid gap-6">
                <LiveGamesWidget />
                <DailyPicksWidget />
                <TopGamesWidget />
            </div>
        </div>
    )
}
