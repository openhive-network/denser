import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // User-specific pages - never cache (notifications, settings, feed)
    // These rules must come BEFORE the defaults to take precedence
    {
      matcher: /\/@[^/]+\/(notifications|settings|feed)/i,
      handler: new NetworkOnly(),
    },
    // Next.js data (RSC) for these pages - never cache
    {
      matcher: /\/_next\/data\/.+\/%40[^/]+\/(notifications|settings|feed)\.json$/i,
      handler: new NetworkOnly(),
    },
    // Include all default caching rules for static assets (JS, CSS, images, fonts, etc.)
    ...defaultCache,
  ],
});

serwist.addEventListeners();
