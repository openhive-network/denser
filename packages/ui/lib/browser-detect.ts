/**
 * Browser detection utilities for handling browser-specific behavior.
 */

/**
 * Detects if the current browser is Safari.
 *
 * Safari is identified by:
 * 1. Contains "Safari" in userAgent
 * 2. Does NOT contain "Chrome" (Chrome also has Safari in UA)
 * 3. Does NOT contain "Chromium"
 * 4. Does NOT contain "Android" (Android WebView)
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isSafariUA = /Safari/i.test(ua);
  const isChrome = /Chrome|Chromium/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return isSafariUA && !isChrome && !isAndroid;
}

/**
 * Detects if the browser has known issues with OAuth popups.
 * Currently this is Safari due to ITP (Intelligent Tracking Prevention).
 */
export function hasOAuthPopupIssues(): boolean {
  return isSafari();
}
