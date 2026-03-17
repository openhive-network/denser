'use client';

import { useEffect } from 'react';

/**
 * Unregisters legacy service workers left over from next-pwa and clears
 * their caches. This prevents stale cached assets from being served after
 * the PWA integration was removed.
 *
 * This component can be removed once most active users have visited the
 * site and had their SWs cleaned up (a few weeks after deployment).
 */
export default function ServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });

    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }

    // Clean up version key used by the old SW update logic
    try {
      localStorage.removeItem('sw-cache-version');
    } catch {
      // Ignore storage errors
    }
  }, []);

  return null;
}
