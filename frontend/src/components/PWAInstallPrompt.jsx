import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

import { usePwaInstall } from '../lib/pwaInstall';
import { EASE, tap } from '../lib/motion';

/**
 * The unprompted nudge to install the app.
 *
 * It appears at most once per browser: dismissing or installing writes
 * `pwa-prompt-seen`, and nothing clears it. That is deliberate -- a storefront
 * that re-asks on every visit is worse than one that asks once -- so the
 * permanent way in is the "Install app" row on Account, which never hides.
 *
 * The prompt event itself is owned by `lib/pwaInstall`, not by this component;
 * see the note there for why.
 */

const SEEN_KEY = 'pwa-prompt-seen';

const PWAInstallPrompt = () => {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled) return undefined;

    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === 'true';
    } catch {
      // Private mode can throw on read. Treat it as unseen.
    }
    if (seen) return undefined;

    // Let the page settle before covering part of it.
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN_KEY, 'true');
    } catch {
      // Nothing to do -- the prompt simply reappears next visit.
    }
  };

  const handleInstall = async () => {
    await promptInstall();
    close();
  };

  return (
    <AnimatePresence>
      {show && !isInstalled && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          role="dialog"
          aria-label="Install Timeless Baazar"
          className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px] z-50"
        >
          <div className="rounded-[19px] bg-surface-raised border border-line shadow-xl p-5">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 shrink-0 rounded-[16px] bg-brand-50 flex items-center justify-center">
                <Download className="w-6 h-6 text-brand-600" strokeWidth={2} />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-bold text-ink">Install Timeless Baazar</h2>
                <p className="mt-1 text-[14px] leading-[20px] text-ink-muted">
                  Add the shop to your home screen — it opens straight to the shelves, no
                  browser in the way.
                </p>
              </div>

              <motion.button
                whileTap={tap}
                onClick={close}
                aria-label="Not now"
                className="p-1 -m-1 shrink-0 text-ink-faint"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex gap-3 mt-5">
              <motion.button
                whileTap={tap}
                onClick={handleInstall}
                className="flex-1 h-[52px] rounded-[19px] bg-brand-600 text-white text-[16px] font-semibold"
              >
                Install
              </motion.button>
              <motion.button
                whileTap={tap}
                onClick={close}
                className="h-[52px] px-5 rounded-[19px] bg-surface-sunken text-ink text-[16px] font-semibold"
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
