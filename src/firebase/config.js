// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZBQ9hZ8cz3lZymRL4wG1CvpzX_QnmFVM",
  authDomain: "timeless-baazar-e39e9.firebaseapp.com",
  projectId: "timeless-baazar-e39e9",
  storageBucket: "timeless-baazar-e39e9.firebasestorage.app",
  messagingSenderId: "696500682303",
  appId: "1:696500682303:web:680941d19dcd8a7fe1428a",
  measurementId: "G-QJNLYN2JS9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Enable auth persistence (survives page refresh and browser restart)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('🔐 Auth persistence enabled (LOCAL)');
  })
  .catch((error) => {
    console.error('❌ Auth persistence error:', error);
  });

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional, only works in production with HTTPS)
let analytics = null;
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
