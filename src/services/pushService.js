import { supabase } from './supabaseClient';

const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE'; // User needs to provide this or we use a placeholder

export async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW Registered:', registration);
            return registration;
        } catch (error) {
            console.error('SW Registration failed:', error);
        }
    }
}

export async function subscribeToPush() {
    const registration = await navigator.serviceWorker.ready;

    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });

        // Send to backend
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(subscription)
            });
        }

        return subscription;
    } catch (error) {
        console.error('Push Subscription failed:', error);
        throw error;
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
