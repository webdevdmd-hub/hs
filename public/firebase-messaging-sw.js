// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

let messaging = null;
let firebaseInitialized = false;

const initFirebaseIfNeeded = (config) => {
  if (firebaseInitialized) return;
  if (!config) {
    console.warn('Firebase config not provided to messaging service worker.');
    return;
  }

  firebase.initializeApp(config);
  firebaseInitialized = true;

  try {
    messaging = firebase.messaging();
    attachBackgroundHandler();
  } catch (err) {
    console.error('Failed to initialize Firebase messaging in service worker:', err);
  }
};

const attachBackgroundHandler = () => {
  if (!messaging) return;

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'View'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'INIT_FIREBASE') {
    initFirebaseIfNeeded(event.data.firebaseConfig);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Open the app and navigate to the relevant page
    const urlToOpen = event.notification.data?.actionUrl
      ? new URL(`/#${event.notification.data.actionUrl}`, self.location.origin).href
      : self.location.origin;

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});
