'use client';

import { useEffect } from 'react';
import version from '../version.json';

const CACHE_VERSION_KEY = 'sw-cache-version';

/**
 * Clears all service worker caches.
 * Returns true if any caches were cleared.
 */
async function clearAllCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false;
  }

  const keys = await caches.keys();
  if (keys.length === 0) {
    return false;
  }

  await Promise.all(keys.map((key) => caches.delete(key)));
  return true;
}

/**
 * Component that handles service worker updates and cache management.
 *
 * This component:
 * 1. Clears stale caches on version change (prevents WASM hash mismatch issues)
 * 2. Triggers SW update check on mount
 * 3. Listens for controllerchange event and reloads when new SW takes control
 *
 * The version-based cache cleanup ensures users with old cached assets
 * (especially auth worker and WASM files) get fresh content after deployments.
 */
export default function ServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const currentVersion = version.commithash;
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

    // If version changed, clear all caches to prevent stale asset issues
    if (storedVersion !== currentVersion) {
      clearAllCaches()
        .then((cleared) => {
          localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
          if (cleared && storedVersion !== null) {
            // Only reload if we actually cleared caches AND there was a previous version
            // (skip reload on first visit when storedVersion is null)
            window.location.reload();
          }
        })
        .catch(() => {
          // Cache clearing failed, still update version to avoid retry loops
          localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
        });
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
