import { useEffect, useState } from 'react';

/**
 * The one place that owns Chrome's `beforeinstallprompt` event.
 *
 * The browser fires that event **once**, early, and only ever hands out that
 * one object -- so it cannot live inside a component's state or only the first
 * component to mount could ever install the app. It is captured here at module
 * load and handed to every subscriber, which is what lets both the popup and
 * the permanent Account row drive the same native prompt.
 *
 * Chrome fires it only over HTTPS (or localhost) with a registered service
 * worker, and iOS Safari never fires it at all. `canInstall` is therefore false
 * far more often than the app is actually installed, and callers must fall back
 * to telling the user where the browser's own menu item is -- see `platform`.
 */

let deferredPrompt = null;
const subscribers = new Set();

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari does not implement `display-mode`; it sets this instead.
  window.navigator.standalone === true;

let installed = typeof window === 'undefined' ? false : isStandalone();

const notify = () => subscribers.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Without this Chrome shows its own mini-infobar and withholds the event.
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

/** Which manual route to point at when there is no native prompt to fire. */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)) {
    return 'ios';
  }
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Fire the native install dialog.
 *
 * Resolves to 'accepted', 'dismissed', or 'unavailable' when the browser never
 * gave us a prompt to fire. The event is single-use, so it is dropped either
 * way; Chrome re-fires `beforeinstallprompt` on a later visit if the user said
 * no.
 */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';

  const event = deferredPrompt;
  deferredPrompt = null;
  notify();

  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

export function usePwaInstall() {
  const [state, setState] = useState(() => ({
    canInstall: Boolean(deferredPrompt),
    isInstalled: installed,
  }));

  useEffect(() => {
    const sync = () =>
      setState({ canInstall: Boolean(deferredPrompt), isInstalled: installed });

    subscribers.add(sync);
    sync();
    return () => subscribers.delete(sync);
  }, []);

  return { ...state, promptInstall, platform: detectPlatform() };
}
