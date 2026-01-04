import TopGamesWidget from '../components/features/TopGamesWidget';
import DailyPicksWidget from '../components/features/DailyPicksWidget';
import LiveGamesWidget from '../components/features/LiveGamesWidget';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MessageSquare } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <header className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">Z</div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
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

            <div className="grid gap-6">
                <LiveGamesWidget />
                <DailyPicksWidget />
                <TopGamesWidget />
            </div>
        </div>
    )
}
