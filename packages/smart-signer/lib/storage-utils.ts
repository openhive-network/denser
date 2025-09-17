import { isBrowser } from '@ui/lib/logger';

/**
 * Returns all cookies as object. For use on client only.
 *
 * @export
 * @param {string} cookie
 * @returns {Record<string, string>}
 */
export function parseCookie(cookie: string): Record<string, string> {
  const kv: Record<string, string> = {};

  if (!cookie) return kv;

  cookie.split(';').forEach((part) => {
    const [k, v] = part.trim().split('=');
    kv[k.trim()] = v;
  });

  return kv;
}

/**
 * Return cookie value for given cookie name. For use on client only.
 * When cookie doesn't exist returns empty string.
 *
 * @export
 * @param {string} cname
 * @returns {string}
 */
export function getCookie(cname: string): string {
  let name = cname + '=';
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
}

export function isStorageAvailable(
  storageType: 'localStorage' | 'sessionStorage',
  strict: boolean = false // if true also tries to read and write to storage
) {
  let storage: Storage;
  // logger.info('Checking availability of %s', storageType);
  try {
    if (!isBrowser()) return false;
    if ((storageType = 'localStorage')) {
      storage = window.localStorage;
    } else if ((storageType = 'sessionStorage')) {
      storage = window.sessionStorage;
    } else {
      return false;
    }

    // Disabled, because we experience too many writes here.
    // TODO Check why.
    // if (strict) {
    //   const x = '__storage_test__';
    //   storage.setItem(x, x);
    //   storage.removeItem(x);
    // }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Returns true if page is loaded in iframe, false otherwise.
 *
 * @export
 * @returns {boolean}
 */
export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}
