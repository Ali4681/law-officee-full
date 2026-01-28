// get-test-token.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiL072CcS_MZZm9V18J9Fq_CkbDsioiz0",
  authDomain: "law-office-notifications.firebaseapp.com",
  projectId: "law-office-notifications",
  storageBucket: "law-office-notifications.firebasestorage.app",
  messagingSenderId: "509375519115",
  appId: "1:509375519115:web:d689636a5f992dcbb8378e"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

(async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey:
        'BORkRIHmr2A5DhTBnQARYaEJ4jKFgvBrFV0lXUC4qDJdE30Dr6ScCdhZRBKfa3U1-b4yZEtX76SpSWm_wfGgq0g',
    });
    console.log('✅ FCM token:', token);
  } catch (err) {
    console.error('❌ Error getting token:', err);
  }
})();
