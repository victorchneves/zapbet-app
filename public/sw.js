self.addEventListener('push', function (event) {
    const data = event.data ? event.data.json() : {};

    const title = data.title || 'ZapBet';
    const options = {
        body: data.body || 'Nova oportunidade encontrada.',
        icon: '/icon-192x192.png', // Ensure these exist or use default
        badge: '/badge.png',
        data: data.url || '/'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});
