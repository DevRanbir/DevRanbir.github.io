// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import * as firestoreExports from 'firebase/firestore';

// Build Firebase config from environment variables (CRA: REACT_APP_*)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Basic validation: require at least apiKey and projectId
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    try {
      auth = getAuth(app);
    } catch (authInitError) {
      // If auth initialization fails, keep auth as null and log the error.
      // This prevents an uncaught runtime error from stopping the app.
      // The rest of the app can check `auth` before using it.
      // auth errors often mean an invalid/missing API key or environment setup.
      // Do not rethrow here.
      // eslint-disable-next-line no-console
      console.warn('Firebase auth initialization failed:', authInitError);
      auth = null;
    }
  } catch (initError) {
    // If initializeApp throws for any reason, keep exports null and log.
    // eslint-disable-next-line no-console
    console.warn('Firebase initialization failed:', initError);
    app = null;
    db = null;
    auth = null;
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    'Firebase is not configured. Set REACT_APP_FIREBASE_API_KEY and REACT_APP_FIREBASE_PROJECT_ID in your environment.'
  );
}

// Function to ensure user is authenticated (anonymously if needed)
export const ensureAuthenticated = async () => {
  if (!auth) {
    // If auth isn't initialized, return null so callers can handle absence.
    // Avoid throwing to prevent uncaught runtime errors.
    // eslint-disable-next-line no-console
    console.warn('ensureAuthenticated called but Firebase auth is not initialized.');
    return null;
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening after first state change

      if (user) {
        // User is already signed in
        // eslint-disable-next-line no-console
        console.log('🔐 User already authenticated:', user.isAnonymous ? 'Anonymous' : 'Authenticated');
        resolve(user);
      } else {
        // No user signed in, sign in anonymously
        try {
          // eslint-disable-next-line no-console
          console.log('🔐 Signing in anonymously...');
          const userCredential = await signInAnonymously(auth);
          // eslint-disable-next-line no-console
          console.log('✅ Anonymous authentication successful');
          resolve(userCredential.user);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('❌ Anonymous authentication failed:', error);
          reject(error);
        }
      }
    });
  });
};

// Export db and auth (may be null if Firebase is not configured)
export { db, auth };

// Expose to window for quick debugging in development (safe even if null)
window.db = db;
window.auth = auth;
window.firebase = { firestoreExports };

export default app;
