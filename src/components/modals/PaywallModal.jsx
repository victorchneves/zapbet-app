import { X, Lock } from 'lucide-react';
import { Button } from '../ui/button';

export default function PaywallModal({ isOpen, onClose, context = 'general' }) {
    if (!isOpen) return null;

    const handleUpgrade = () => {
        // TODO: Integrate with payment provider (Stripe/Hotmart)
        console.log('Upgrade triggered from context:', context);
        // For now, just navigate to a placeholder
        window.location.href = '/upgrade';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative bg-card border-2 border-primary/20 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-50 p-2"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="space-y-2">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-white text-center">
                        Acesso completo ao ZapBet
                    </h2>
                </div>

                {/* Main Copy */}
                <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        O ZapBet analisa dezenas de jogos todos os dias.
                        Apenas leituras que passam no critério do modelo são liberadas.
                    </p>
                    <p>
                        O plano gratuito permite conhecer a lógica.
                        O acesso completo é para quem busca consistência e método.
                    </p>
                </div>

                {/* Benefits List */}
                <ul className="space-y-3 py-4 border-y border-border">
                    <li className="flex items-start gap-3 text-sm">
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-white">Leitura Principal diária</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-white">Todas as leituras do dia</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-white">Chat com IA sem limites</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-white">Histórico completo para análise e padrão</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm">
                        <span className="text-primary font-bold">✓</span>
                        <span className="text-white">Push diário com a leitura disponível</span>
                    </li>
                </ul>

                {/* Value Anchor */}
                <p className="text-xs text-center text-muted-foreground italic">
                    O acesso premium custa menos que uma aposta mal feita.
                </p>

                {/* CTA */}
                <Button
                    onClick={() => window.location.href = 'https://pay.kirvano.com/44b1f1a1-c154-4a1f-bd9e-058defac0e76'}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 text-base"
                >
                    Ativar acesso completo
                </Button>

                {/* Microcopy */}
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                    Cancele quando quiser.<br />
                    Sem promessa de lucro. Apenas método e disciplina.
                </p>
            </div>
        </div>
    );
}
