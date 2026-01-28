importScripts(
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js',
);

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: 'AIzaSyCiL072CcS_MZZm9V18J9Fq_CkbDsioiz0',
  authDomain: 'law-office-notifications.firebaseapp.com',
  projectId: 'law-office-notifications',
  storageBucket: 'law-office-notifications.firebasestorage.app',
  messagingSenderId: '509375519115',
  appId: '1:509375519115:web:d689636a5f992dcbb8378e',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message', payload);

  const title = payload.data?.title || 'New Notification';
  const options = {
    body:
      payload.data?.body ||
      payload.data?.message ||
      'You have a new notification',
    icon: '/firebase-logo.png', // optional icon
    data: payload.data,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Open URL on click
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/'); // adjust path if needed
      }),
  );
});
