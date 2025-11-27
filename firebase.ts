import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your project's settings on the Firebase console.
export const firebaseConfig = {
  apiKey: "AIzaSyApbQHymJkakiKyfYHYHmf9D7e_818SVVc",
  authDomain: "dmd-project-7d5bc.firebaseapp.com",
  projectId: "dmd-project-7d5bc",
  storageBucket: "dmd-project-7d5bc.appspot.com",
  messagingSenderId: "752938708459",
  appId: "1:752938708459:web:7afe66d7c91de32b30bdae"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a Firestore instance
export const db = getFirestore(app);

// Get Auth instance
export const auth = getAuth(app);

// Get Functions instance
export const functions = getFunctions(app);