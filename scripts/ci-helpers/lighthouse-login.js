/**
 * The logged-in reader of the integration Lighthouse check: the state denser's
 * Keychain login leaves in the browser (packages/smart-signer, use-sign-in.tsx and
 * user-localstore.ts), the `observer` cookie and the localStorage `user` entry. No
 * key is stored or needed: the reader reads, it never signs.
 */

const DEFAULT_OBSERVER = 'blocktrades';
const OBSERVER_PLACEHOLDER = '{observer}';
const USER_STORAGE_KEY = 'user';
// Hive account names: 3-16 characters, lowercase letters, digits, dots and dashes.
const ACCOUNT_NAME = /^[a-z][a-z0-9.-]{2,15}$/;

/** `observer`, or throws when it cannot be a Hive account name. */
function validObserver(observer) {
  if (!ACCOUNT_NAME.test(observer || '')) throw new Error(`not a Hive account name: ${JSON.stringify(observer)}`);
  return observer;
}

/** The localStorage `user` entry of a Keychain login with the posting key. */
function observerUser(observer) {
  return {
    isLoggedIn: true,
    username: observer,
    avatarUrl: '',
    loginType: 'keychain',
    keyType: 'posting',
    authenticateOnBackend: false,
    chatAuthToken: '',
    oauthConsent: {},
    strict: false,
  };
}

/** The `observer` cookie the sign-in sets for the server's rendering, as a puppeteer cookie. */
function observerCookie(site, observer) {
  return { name: 'observer', value: observer, url: site, path: '/', sameSite: 'Lax', secure: site.startsWith('https:') };
}

// Runs in the page, before its scripts, on every document; about:blank (where
// Lighthouse starts) and other origins are left alone.
function seedLocalStorage(origin, key, value) {
  if (window.location.origin === origin) window.localStorage.setItem(key, value);
}

/**
 * Logs `page` (a puppeteer Page) in as `observer` on `site`. Lighthouse must then run
 * with `disableStorageReset: true`, or it clears both before the navigation.
 */
async function logIn(page, site, observer) {
  await page.setCookie(observerCookie(site, observer));
  await page.evaluateOnNewDocument(seedLocalStorage, new URL(site).origin, USER_STORAGE_KEY, JSON.stringify(observerUser(observer)));
}

/** The logged-in routes and their thresholds, `{observer}` in a route replaced by `observer`. */
function observerRoutes(thresholds, observer) {
  return Object.fromEntries(
    Object.entries(thresholds).map(([route, limits]) => [route.split(OBSERVER_PLACEHOLDER).join(observer), limits])
  );
}

module.exports = { DEFAULT_OBSERVER, validObserver, logIn, observerRoutes };
