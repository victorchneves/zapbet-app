import { useState, useEffect } from 'react';
import { subscribeToPush } from '../../services/pushService';
import { Button } from '../ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function PushToggle() {
    const [permission, setPermission] = useState(() => {
        if (typeof Notification === 'undefined') return 'denied';
        return Notification.permission;
    });
    const [loading, setLoading] = useState(false);

    const supportsPush = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

    const handleSubscribe = async () => {
        if (!supportsPush) {
            alert('Seu navegador não suporta notificações Push.');
            return;
        }

        setLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                await subscribeToPush(); // Assuming subscribeUserToPush was a typo and should be subscribeToPush
                // alert('Notificações ativadas! Fique atento às Calls.');
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            alert('Erro ao ativar notificações. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!supportsPush) return null;

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
