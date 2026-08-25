import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiDownload } from 'react-icons/hi';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;

    if (isInstalled) {
      console.log('✅ App is already installed!');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Show custom install prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      console.log('📲 Install prompt ready!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already dismissed
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      console.log('ℹ️ Install prompt was previously dismissed');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('⚠️ No install prompt available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`👤 User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember user dismissed it (for this session)
    localStorage.setItem('installPromptDismissed', 'true');
    console.log('🚫 Install prompt dismissed by user');
  };

  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-orange-500 p-5">
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="pr-8">
              <div className="flex items-center gap-3 mb-3">
                {/* App Icon */}
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-2xl font-bold text-white">TB</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    Install Timeless Baazar
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Quick access from your home screen
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                📱 Add to your home screen for:
              </p>

              <ul className="space-y-1.5 mb-4 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Fast access like a native app</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Works offline (view cart, orders)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>No browser clutter</span>
                </li>
              </ul>

              {/* Install Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
              >
                <HiDownload className="w-5 h-5" />
                <span>Install App</span>
              </motion.button>

              <button
                onClick={handleDismiss}
                className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
