/**
 * The UI language cookie, shared by every app served from one origin: the server renders texts and
 * `<html lang>` from it, so it is the only place the language is stored.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';

function cookieValues(name: string): string[] {
  if (typeof document === 'undefined') return [];
  const prefix = `${name}=`;
  return document.cookie
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair.startsWith(prefix))
    .map((pair) => pair.slice(prefix.length));
}

/**
 * Paths of the current page and its ancestors (`/blog/@alice` gives `/blog/@alice`, `/blog`): the paths
 * a cookie visible to this page can be scoped to, other than `/`.
 */
function pathScopes(pathname: string): string[] {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((_, index) => `/${segments.slice(0, index + 1).join('/')}`).reverse();
}

/**
 * The language the server resolves for this page, or '' without a cookie.
 * When copies scoped to several paths are visible, Next.js `cookies()` keeps the last one of the
 * header (the browser sends the longest path first, so the `path=/` copy), and so does this.
 */
export function readLocaleCookie(name: string = LOCALE_COOKIE): string {
  return cookieValues(name).at(-1) ?? '';
}

/**
 * Stores `locale` as the one origin-wide language cookie: removes copies scoped to the current page's
 * paths (written by older builds without `path=/`), then writes the `path=/` cookie.
 */
export function writeLocaleCookie(locale: string): void {
  for (const path of pathScopes(window.location.pathname)) {
    document.cookie = `${LOCALE_COOKIE}=; path=${path}; expires=${EXPIRED}`;
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

/**
 * Rewrites the language cookie as the one `path=/` cookie (a copy an older build scoped to this page's
 * path is invisible to the other apps of the origin, and indistinguishable here) and returns its value.
 * Keeps the value the server resolves when it is set (and in `accepted`, when given); otherwise
 * writes `fallback`.
 */
export function ensureLocaleCookie(fallback: string, accepted?: readonly string[]): string {
  const current = readLocaleCookie();
  const isUsable = current !== '' && (!accepted || accepted.includes(current));
  const locale = isUsable ? current : fallback;
  writeLocaleCookie(locale);
  return locale;
}
