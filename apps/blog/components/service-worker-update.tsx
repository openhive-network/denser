'use client';

import { useEffect } from 'react';

/**
 * Component that handles service worker updates.
 *
 * With skipWaiting: true and clientsClaim: true in next-pwa config,
 * new service workers activate immediately. This component:
 * 1. Triggers an update check on mount
 * 2. Listens for the controllerchange event (when new SW takes control)
 * 3. Reloads the page to ensure fresh assets are loaded
 *
 * This prevents issues where old cached assets (especially WASM files)
 * cause errors after deployments.
 */
export default function ServiceWorkerUpdate() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // When a new service worker takes control, reload to get fresh assets
    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Trigger update check when app loads
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update().catch(() => {
          // Update check failed, ignore silently
        });
      })
      .catch(() => {
        // SW not ready, ignore silently
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
