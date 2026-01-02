import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchFixtureDetails } from '../services/dataService';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';

export default function GameDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            const details = await fetchFixtureDetails(id);
            setData(details);
            setLoading(false);
        };
        load();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-white">Carregando detalhes...</div>;
    if (!data || !data.fixture) return <div className="p-8 text-center text-red-500">Jogo não encontrado.</div>;

    const { fixture } = data;

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* Header Image/Gradient */}
            <div className="bg-gradient-to-b from-primary/20 via-background to-background p-6 text-center">
                <Button variant="ghost" className="absolute left-4 top-4 text-white" onClick={() => navigate(-1)}>← Voltar</Button>
                <div className="mt-8 text-xs text-primary font-bold uppercase tracking-widest">{fixture.leagues?.name}</div>
                <div className="text-muted-foreground text-xs mt-1">{format(new Date(fixture.date_utc), 'dd/MM HH:mm')}</div>
            </div>

            <div className="px-4 -mt-6">
                <div className="flex justify-between items-center text-xl font-bold text-white px-4 mb-8">
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        {/* <img src={fixture.home?.logo_url} className="h-12 w-12"/> */}
                        <span className="text-center">{fixture.home?.name}</span>
                    </div>
                    <div className="text-muted-foreground text-sm">vs</div>
                    <div className="flex flex-col items-center gap-2 w-1/3">
                        {/* <img src={fixture.away?.logo_url} className="h-12 w-12"/> */}
                        <span className="text-center">{fixture.away?.name}</span>
                    </div>
                </div>

                {/* Stats / Events Placeholder */}
                <div className="grid gap-4">
                    <div className="bg-card border border-border rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-2">Status</h3>
                        <p className="text-muted-foreground text-sm">{fixture.status}</p>
                        <p className="text-muted-foreground text-xs mt-1">Venue: {fixture.venue}</p>
                    </div>

                    {/* CTA */}
                    <Button className="w-full bg-primary text-black hover:bg-primary/90 font-bold" size="lg" onClick={() => navigate('/')}>
                        Perguntar à IA sobre esse jogo
                    </Button>
                </div>
            </div>
        </div>
    )
}
