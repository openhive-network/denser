import { appApiPath } from '@hive/ui/lib/app-api-path';

export const GOOGLE_DRIVE_AUTH_PATH = '/api/google-drive/auth';
export const GOOGLE_DRIVE_REFRESH_PATH = '/api/google-drive/refresh';
export const GOOGLE_DRIVE_CALLBACK_PATH = '/api/google-drive/callback';

/**
 * Absolute URL of one of the app's Google Drive API routes, under the app's base path.
 * @param origin - the app's origin (`https://example.com`), without a path
 * @param path - one of the `GOOGLE_DRIVE_*_PATH` routes
 */
export function googleDriveApiUrl(origin: string, path: string): string {
  return `${origin}${appApiPath(path)}`;
}

/**
 * The redirect-flow `redirect_uri`. The browser sends it to Google and the server repeats it in the
 * token exchange, which Google refuses unless the two are identical, so both build it here.
 */
export function googleDriveCallbackUri(origin: string): string {
  return googleDriveApiUrl(origin, GOOGLE_DRIVE_CALLBACK_PATH);
}

/** The request headers a server falls back to when no canonical site domain is configured. */
export interface IGoogleDriveRequestHeaders {
  host?: string | null;
  forwardedProto?: string | null;
}

/**
 * The public origin the browser sees, as the server can know it: the origin of the configured
 * site domain (REACT_APP_SITE_DOMAIN). Behind the reverse proxy the Host header can be an internal
 * name, and it is client-controlled, so the request headers are only a local-dev fallback.
 */
export function googleDriveServerOrigin(siteDomain: string | undefined, headers: IGoogleDriveRequestHeaders): string {
  if (siteDomain) {
    try {
      return new URL(siteDomain).origin;
    } catch {
      // Misconfigured site domain: fall back to the request headers.
    }
  }
  return `${headers.forwardedProto || 'https'}://${headers.host}`;
}
