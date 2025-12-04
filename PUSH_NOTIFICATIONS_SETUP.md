# Firebase Push Notifications Setup Guide

This project now includes Firebase Cloud Messaging (FCM) for push notifications. Follow these steps to complete the setup.

## 🔧 Setup Steps

### 1. Generate VAPID Key (Web Push Certificate)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **dmd-project-7d5bc**
3. Click the gear icon ⚙️ → **Project settings**
4. Go to the **Cloud Messaging** tab
5. Scroll down to **Web Push certificates** section
6. Click **Generate key pair**
7. Copy the generated key (starts with `B...`)

### 2. Update VAPID Key in Code

Open `hooks/usePushNotifications.tsx` and replace `YOUR_VAPID_KEY_HERE` with your actual VAPID key:

```typescript
const VAPID_KEY = 'BPx...your-actual-key-here...xyz';
```

### 3. Deploy Service Worker

The service worker file is located at `public/firebase-messaging-sw.js`.

**For Production (Firebase Hosting):**
- The service worker will be automatically deployed with your app
- Make sure `firebase.json` includes the public folder

**For Development (Vite):**
- The service worker needs to be accessible at `/firebase-messaging-sw.js`
- Vite will serve files from the `public` folder automatically

### 4. Test Push Notifications

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Login to your app**

3. **Click the bell icon** in the header

4. **Click the settings gear icon** (⚙️) in the notification dropdown

5. **Click "Enable Push Notifications"**

6. **Allow notifications** when your browser prompts you

7. **Test it:** Have another user send you a notification (assign you a task, create a quotation request, etc.)

## 📱 How It Works

### User Flow:

1. **User clicks "Enable Push Notifications"**
   - Browser requests notification permission
   - Service worker registers
   - FCM token generated
   - Token saved to Firestore in user document

2. **When notification is sent:**
   - System creates notification in Firestore
   - FCM sends push notification to user's device
   - User receives notification (even if app is closed)

3. **When user clicks notification:**
   - App opens/focuses
   - Navigates to relevant page (if actionUrl provided)

### Files Added/Modified:

#### New Files:
- `public/firebase-messaging-sw.js` - Service worker for background notifications
- `hooks/usePushNotifications.tsx` - Push notification management hook
- `PUSH_NOTIFICATIONS_SETUP.md` - This file

#### Modified Files:
- `firebase.ts` - Added FCM initialization
- `types.ts` - Added `fcmToken` fields to User interface
- `components/layout/Header.tsx` - Added push notification settings UI
- `hooks/useCRM.tsx` - Ready for push notification integration (see below)

## 🔔 Sending Push Notifications

Currently, notifications are only stored in Firestore. To actually SEND push notifications to user devices, you need to integrate with Firebase Cloud Functions.

### Option A: Client-side (Current - Limited)
The current implementation stores FCM tokens but doesn't actually send push notifications. Users will receive:
- ✅ In-app notifications (when logged in)
- ✅ Browser notifications (when app is open in foreground)
- ❌ Background notifications (when app is closed) - **Needs Cloud Functions**

### Option B: Server-side with Cloud Functions (Recommended)

To send actual push notifications, you need to create a Firebase Cloud Function:

1. **Navigate to functions folder:**
   ```bash
   cd functions
   npm install firebase-admin
   ```

2. **Create notification function** in `functions/src/index.ts`:

```typescript
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();

    // Get recipient's FCM token
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(notification.recipientId)
      .get();

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log('No FCM token for user:', notification.recipientId);
      return null;
    }

    // Send push notification
    const message = {
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: {
        notificationId: snapshot.id,
        actionUrl: notification.actionUrl || '',
        relatedId: notification.relatedId || '',
        relatedType: notification.relatedType || ''
      },
      token: fcmToken
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  });
```

3. **Deploy the function:**
   ```bash
   firebase deploy --only functions
   ```

## 🌐 Browser Compatibility

Push notifications work on:
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari 16+ (macOS & iOS 16+)
- ❌ iOS Safari < 16 (not supported)

## 🔒 Security Considerations

1. **VAPID Key**: Never commit VAPID keys to public repositories
2. **FCM Tokens**: Are user-specific and automatically invalidated when:
   - User clears browser data
   - User revokes notification permission
   - Token expires (Firebase handles this)

3. **Service Worker Scope**: The service worker runs at root scope (`/`)

## 🐛 Troubleshooting

### "Service worker registration failed"
- Check that `firebase-messaging-sw.js` is in the `public` folder
- Ensure the file is being served at `/firebase-messaging-sw.js`
- Check browser console for specific errors

### "Permission denied"
- User blocked notifications in browser settings
- Go to browser settings → Site settings → Notifications
- Allow notifications for your site

### "FCM token not generated"
- Verify VAPID key is correct
- Check that Firebase project has Cloud Messaging enabled
- Ensure service worker registered successfully

### "Notifications not received when app is closed"
- This requires Cloud Functions (see Option B above)
- Verify Cloud Function is deployed
- Check Firebase Functions logs for errors

## 📚 Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Workers Guide](https://developers.google.com/web/fundamentals/primers/service-workers)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)

## ✅ Current Status

- [x] Service worker created
- [x] FCM initialized
- [x] Token management hook created
- [x] UI for enabling/disabling push notifications
- [x] FCM token storage in Firestore
- [x] Foreground notification handling
- [ ] **Cloud Function for sending push notifications (Required for full functionality)**
- [ ] **VAPID key configuration (Required - see Step 1 above)**

---

**Note**: Without completing the Cloud Function setup (Option B), push notifications will only work when the app is open. Complete the Cloud Function setup for full background notification support.
