import { useState, useEffect } from 'react';
import { subscribeToPush } from '../../services/pushService';
import { Button } from '../ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function PushToggle() {
    const [permission, setPermission] = useState(Notification.permission);
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === 'granted') {
                await subscribeToPush();
                // alert('Notificações ativadas! Fique atento às Calls.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao ativar notificações. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (permission === 'granted') {
        return (
            <Button variant="ghost" size="icon" className="text-primary" disabled>
                <Bell size={20} />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-white"
            onClick={handleSubscribe}
            disabled={loading}
        >
            {loading ? <span className="animate-spin">⌛</span> : <BellOff size={20} />}
        </Button>
    );
}
