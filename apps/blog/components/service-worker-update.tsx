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
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Track the initial controller so we only reload on actual SW changes,
    // not on first visit when a SW is installed for the first time.
    const initialController = navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      // Only reload if there was a previous controller — this means
      // an existing SW was replaced. Skip on first-ever SW install.
      if (initialController) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Trigger update check when app loads
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update().catch((error: unknown) => {
          console.warn('Service worker update check failed:', error);
        });
      })
      .catch((error: unknown) => {
        console.warn('Service worker not ready:', error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
