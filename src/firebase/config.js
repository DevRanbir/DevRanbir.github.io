// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import * as firestoreExports from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v9-compat and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Function to ensure user is authenticated (anonymously if needed)
export const ensureAuthenticated = async () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening after first state change
      
      if (user) {
        // User is already signed in
        console.log('🔐 User already authenticated:', user.isAnonymous ? 'Anonymous' : 'Authenticated');
        resolve(user);
      } else {
        // No user signed in, sign in anonymously
        try {
          console.log('🔐 Signing in anonymously...');
          const userCredential = await signInAnonymously(auth);
          console.log('✅ Anonymous authentication successful');
          resolve(userCredential.user);
        } catch (error) {
          console.error('❌ Anonymous authentication failed:', error);
          reject(error);
        }
      }
    });
  });
};

window.db = db;
window.auth = auth;


window.firebase = { firestoreExports };
export default app;
