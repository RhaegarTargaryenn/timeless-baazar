import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiDownload } from 'react-icons/hi';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 3 seconds
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen');
        if (!hasSeenPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('✅ PWA installed successfully!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-seen', 'true');
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-gradient-to-br from-orange-500 to-accent-600 text-white rounded-2xl shadow-glow-lg p-5 border-2 border-white/20">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold">TB</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Install Timeless Baazar</h3>
                  <p className="text-xs text-white/90">Get the app experience!</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <HiX className="w-5 h-5" />
              </motion.button>
            </div>

            <ul className="text-sm space-y-1.5 mb-4 text-white/95">
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                <span>Works offline</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                <span>Fast loading</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-300">✓</span>
                <span>Add to home screen</span>
              </li>
            </ul>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInstall}
                className="flex-1 bg-white text-orange-600 font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <HiDownload className="w-5 h-5" />
                Install Now
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDismiss}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Later
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
