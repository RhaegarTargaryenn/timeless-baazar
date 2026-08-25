// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Fail loudly at boot rather than at the first sign-in attempt.
const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  throw new Error(
    `Firebase config is missing: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill it in.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Enable auth persistence (survives page refresh and browser restart)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Firebase auth persistence could not be enabled:', error);
});

// Firestore is gone: products, orders, addresses and profiles all live in
// MongoDB behind the API now. Firebase is kept for Auth only.

// Initialize Analytics (optional, only works in production with HTTPS)
let analytics = null;
if (import.meta.env.PROD && typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
