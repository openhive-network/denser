/** The deployment settings an in-app redirect URL is built from. */
export interface IInAppRedirectConfig {
  /** REACT_APP_SITE_DOMAIN: the public site URL; only its origin is used. */
  siteDomain?: string;
  /** NEXT_PUBLIC_BASE_PATH: the base path next.config.js serves the app under. */
  basePath?: string;
  production: boolean;
}

function canonicalOrigin(siteDomain: string | undefined): string | undefined {
  if (!siteDomain) return undefined;
  try {
    return new URL(siteDomain).origin;
  } catch {
    return undefined;
  }
}

// Behind the reverse proxy the Host header is its upstream block name (e.g. "newblog"),
// not the public hostname, and it is client-controllable, so it is only a local-dev
// fallback for a deployment without a site domain.
function requestOrigin(headers: Headers, production: boolean): string {
  const host = headers.get('host') ?? 'localhost:3000';
  const scheme = headers.get('x-forwarded-proto') ?? (production ? 'https' : 'http');
  return `${scheme}://${host}`;
}

/**
 * The absolute URL of an app path (e.g. `/hive-1/@alice/post`), under the app's base
 * path, on the configured site's origin.
 *
 * @param path - an app route path starting with `/`, without the base path
 */
export function inAppRedirectUrl(path: string, config: IInAppRedirectConfig, headers: Headers): URL {
  const origin = canonicalOrigin(config.siteDomain) ?? requestOrigin(headers, config.production);
  const basePath = (config.basePath ?? '').replace(/\/+$/, '');
  return new URL(`${basePath}${path}`, origin);
}
