import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'

export default function Onboarding() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [step, setStep] = useState(1);
    const [bankroll, setBankroll] = useState('');
    const [risk, setRisk] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFinish = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    bankroll: parseFloat(bankroll),
                    risk_profile: risk.toLowerCase(),
                    subscription_status: 'trial'
                })
                .eq('id', user.id);

            if (error) throw error;
            navigate('/');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar perfil.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto max-w-md min-h-screen py-8 px-4 flex flex-col justify-center text-foreground bg-background">
            <div className="space-y-2 text-center mb-8">
                <h1 className="text-3xl font-bold text-white">
                    {step === 1 ? 'Defina sua Banca' : 'Perfil de Risco'}
                </h1>
                <p className="text-muted-foreground">
                    {step === 1
                        ? 'Quanto você tem disponível para investir nas operações?'
                        : 'Para a IA te dar as melhores calls, precisamos calibrar seu perfil.'}
                </p>
            </div>

            {step === 1 && (
                <div className="space-y-4 fade-in">
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                        <Input
                            type="number"
                            placeholder="1000.00"
                            className="pl-10 text-lg bg-card border-border text-white"
                            value={bankroll}
                            onChange={(e) => setBankroll(e.target.value)}
                        />
                    </div>
                    <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={!bankroll}>
                        Próximo
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 fade-in">
                    <div
                        className={cn("p-4 border rounded-xl cursor-pointer transition-all", risk === 'conservative' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted')}
                        onClick={() => setRisk('conservative')}
                    >
                        <h3 className="font-bold text-white mb-1">Conservador</h3>
                        <p className="text-sm text-muted-foreground">Prefiro lucros pequenos e constantes.</p>
                    </div>

                    <div
                        className={cn("p-4 border rounded-xl cursor-pointer transition-all", risk === 'moderate' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted')}
                        onClick={() => setRisk('moderate')}
                    >
                        <h3 className="font-bold text-white mb-1">Moderado</h3>
                        <p className="text-sm text-muted-foreground">Equilíbrio entre segurança e retorno.</p>
                    </div>

                    <div
                        className={cn("p-4 border rounded-xl cursor-pointer transition-all", risk === 'aggressive' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted')}
                        onClick={() => setRisk('aggressive')}
                    >
                        <h3 className="font-bold text-white mb-1">Agressivo</h3>
                        <p className="text-sm text-muted-foreground">Oportunidades de alto valor (Bingo).</p>
                    </div>

                    <Button className="w-full mt-4" size="lg" onClick={handleFinish} disabled={!risk || loading}>
                        {loading ? 'Salvando...' : 'Finalizar Setup'}
                    </Button>
                </div>
            )}
        </div>
    )
}
