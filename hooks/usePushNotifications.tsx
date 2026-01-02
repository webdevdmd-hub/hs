import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, getMessagingInstance, firebaseConfig } from '../firebase';
import { useAuth } from './useAuth';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker and get FCM token
  const requestPermission = async () => {
    if (!isSupported || !currentUser) {
      console.warn('Push notifications not supported or user not logged in');
      return null;
    }

    if (!VAPID_KEY) {
      console.warn('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in your environment.');
      return null;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;

      // Send Firebase config to service worker to avoid hardcoding secrets there
      const targetSW = readyRegistration.active || readyRegistration.waiting || readyRegistration.installing;
      targetSW?.postMessage({
        type: 'INIT_FIREBASE',
        firebaseConfig,
      });

      // Get FCM token
      const messaging = getMessagingInstance();
      if (!messaging) {
        console.warn('Messaging not initialized');
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token:', token);
        setFcmToken(token);

        // Store token in Firestore for this user
        await saveFCMToken(token);

        // Listen for foreground messages
        setupForegroundMessageListener(messaging);

        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  };

  // Save FCM token to user document
  const saveFCMToken = async (token: string) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  };

  // Setup listener for foreground messages
  const setupForegroundMessageListener = (messaging: any) => {
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification when app is in foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'New Notification', {
          body: payload.notification.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: payload.data
        });
      }
    });
  };

  // Revoke notification permission (remove token)
  const revokePermission = async () => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        fcmToken: null,
        fcmTokenUpdatedAt: new Date().toISOString()
      });
      setFcmToken(null);
      console.log('FCM token removed');
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  };

  return {
    isSupported,
    permission,
    fcmToken,
    requestPermission,
    revokePermission
  };
};
