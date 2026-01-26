import { supabase } from './supabaseClient';

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push not supported');
    }

    if (!PUBLIC_KEY) {
        console.error('Missing VAPID Public Key');
        throw new Error('Configuration error');
    }

    // 1. Register SW (if not already)
    // We assume main.jsx or user triggers this. 
    // But let's ensure it here.
    const registration = await navigator.serviceWorker.ready;

    // 2. Subscribe
    const validKey = urlBase64ToUint8Array(PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: validKey
    });

    // 3. Send to Backend
    const { data: { user } } = await supabase.auth.getUser();

    // If no user, we can't save (RLS policies usually require user).
    // But for public alerts, maybe we want anonymous? 
    // Currently our subscribe endpoint expects data.
    // Let's pass user_id if logged in.

    const res = await fetch('/api/push/actions?action=subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subscription: subscription,
            user_id: user?.id || null // Handle null in backend if needed
        })
    });

    if (!res.ok) throw new Error('Failed to save subscription');

    return subscription;
}
