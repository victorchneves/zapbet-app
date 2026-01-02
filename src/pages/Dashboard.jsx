import TopGamesWidget from '../components/features/TopGamesWidget';
import DailyPicksWidget from '../components/features/DailyPicksWidget';

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <header className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">Z</div>
            </header>

            <div className="grid gap-6">
                <TopGamesWidget />
                <DailyPicksWidget />

                {/* Live Score Placeholder */}
                <section className="space-y-3 opacity-50 pointer-events-none grayscale">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ao Vivo (Em breve)</h3>
                    <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-center text-muted-foreground text-sm">Nenhum jogo ao vivo relevante agora.</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
