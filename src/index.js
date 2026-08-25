import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// Initialize Firebase
import './firebase/config';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
// DEVELOPMENT: Disabled to avoid cache issues during development
// PRODUCTION: Automatically enabled when deployed (see below)
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: () => {
      console.log('✅ App ready to work offline!');
    },
    onUpdate: (registration) => {
      console.log('🔄 New version available! Please refresh to update.');
      // Auto-update the service worker
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    },
  });
} else {
  console.log('🚧 Development mode: Service Worker disabled');
  serviceWorkerRegistration.unregister();
}

