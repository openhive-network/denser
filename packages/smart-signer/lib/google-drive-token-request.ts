import type { IncomingHttpHeaders } from 'http';
import type { User } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { isSameOriginRequest } from '@smart-signer/lib/same-origin-request';
import { LOGIN_CHALLENGE_COOKIE } from '@smart-signer/lib/api-handlers/auth/challenge';

const logger = getLogger('google-drive-auth');

/** What the Google Drive token routes read of a request to decide whether it may use the app's Google client */
export interface IGoogleDriveTokenRequest {
  headers: IncomingHttpHeaders;
  cookies: Partial<Record<string, string>>;
  /** The user of the request's server session, undefined when it has none or it could not be read */
  user: User | undefined;
}

export interface IGoogleDriveTokenAnswer {
  status: number;
  body: { accessToken?: string; error?: string };
}

/** Why the request did not come from a page of this site, or undefined when it did */
function crossSiteRefusal(headers: IncomingHttpHeaders): string | undefined {
  if (!Object.hasOwn(headers, csrfHeaderName)) return `Missing ${csrfHeaderName} header`;
  if (!isSameOriginRequest(headers)) return 'Cross-origin request';
  return undefined;
}

/**
 * Why the request may not exchange a Google authorization code with the app's Google OAuth client,
 * or undefined when it may: it must carry the CSRF header, come from a page of this site and have
 * a signed-in server session. A sign-in exchanges its code before its session exists, after
 * fetching the login challenge, so the login challenge cookie stands in for the session.
 */
export function googleDriveCodeExchangeRefusal(request: IGoogleDriveTokenRequest): string | undefined {
  const crossSite = crossSiteRefusal(request.headers);
  if (crossSite) return crossSite;
  if (request.user?.isLoggedIn || request.cookies[LOGIN_CHALLENGE_COOKIE]) return undefined;
  return 'No signed-in session';
}

/**
 * Why the request may not refresh a Google access token with the app's Google OAuth client, or
 * undefined when it may: as `googleDriveCodeExchangeRefusal`, but only a signed-in server session
 * will do. The login challenge cookie is anyone's for the asking, so it would let a copied refresh
 * token be used from anywhere.
 */
export function googleDriveRefreshRefusal(request: IGoogleDriveTokenRequest): string | undefined {
  const crossSite = crossSiteRefusal(request.headers);
  if (crossSite) return crossSite;
  return request.user?.isLoggedIn ? undefined : 'No signed-in session';
}

/**
 * `POST /api/google-drive/refresh` with the JSON body `{ refreshToken }`: `200 { accessToken }`
 * from `refreshAccessToken`; `403` to a request `googleDriveRefreshRefusal` refuses, without
 * calling it; `400` without a refresh token; `500` when it fails.
 */
export async function answerGoogleDriveRefresh(
  request: IGoogleDriveTokenRequest,
  body: unknown,
  refreshAccessToken: (refreshToken: string) => Promise<string | null | undefined>
): Promise<IGoogleDriveTokenAnswer> {
  const refusal = googleDriveRefreshRefusal(request);
  if (refusal) {
    logger.info('Refused Google Drive token refresh: %s', refusal);
    return { status: 403, body: { error: 'Forbidden' } };
  }

  const refreshToken = typeof body === 'object' && body !== null ? Reflect.get(body, 'refreshToken') : undefined;
  if (!refreshToken || typeof refreshToken !== 'string') {
    logger.debug('Received invalid Google Drive refresh token format');
    return { status: 400, body: { error: 'Invalid refresh token format' } };
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    return { status: 200, body: { accessToken: accessToken ?? undefined } };
  } catch (error) {
    logger.error('Error refreshing Google Drive access token: %s', error instanceof Error ? error.message : 'Unknown error');
    return { status: 500, body: { error: 'Internal server error' } };
  }
}
