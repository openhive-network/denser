import { DEFAULT_LOCALE, LOCALE_COOKIE } from '@hive/ui/lib/locale-cookie.ts';
import { parseAcceptLanguage, pickSupportedLocale } from '@hive/ui/lib/locale-negotiation.ts';
import type { RequestCookie } from './public-cache.ts';

/**
 * The language to render a visitor who has none yet in: the first supported language of
 * `Accept-Language`, when the request carries no language cookie at all and that language is not
 * `DEFAULT_LOCALE` (which renders without a cookie). Null otherwise: a cookie, whatever its value,
 * is the reader's choice or one an app of the origin already made.
 */
export function detectFirstVisitLocale(
  cookies: readonly RequestCookie[],
  acceptLanguage: string | null,
  locales: readonly string[]
): string | null {
  if (cookies.some(({ name }) => name === LOCALE_COOKIE)) return null;
  const locale = pickSupportedLocale(parseAcceptLanguage(acceptLanguage), locales);
  return locale && locale !== DEFAULT_LOCALE ? locale : null;
}

/** A `Cookie` request header with `name=value` added to `header`'s cookies. */
export function withRequestCookie(header: string | null, name: string, value: string): string {
  const pair = `${name}=${value}`;
  return header?.trim() ? `${header}; ${pair}` : pair;
}
