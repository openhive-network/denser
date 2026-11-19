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

/**
 * Why the request may not exchange tokens with the app's Google OAuth client, or undefined when it
 * may: it must carry the CSRF header, come from a page of this site and have a signed-in server
 * session. A sign-in signs before its session exists, after fetching the login challenge, so
 * the login challenge cookie stands in for the session.
 */
export function googleDriveTokenRequestRefusal(request: IGoogleDriveTokenRequest): string | undefined {
  if (!Object.hasOwn(request.headers, csrfHeaderName)) return `Missing ${csrfHeaderName} header`;
  if (!isSameOriginRequest(request.headers)) return 'Cross-origin request';
  if (request.user?.isLoggedIn || request.cookies[LOGIN_CHALLENGE_COOKIE]) return undefined;
  return 'No signed-in session';
}

/**
 * `POST /api/google-drive/refresh` with the JSON body `{ refreshToken }`: `200 { accessToken }`
 * from `refreshAccessToken`; `403` to a request `googleDriveTokenRequestRefusal` refuses, without
 * calling it; `400` without a refresh token; `500` when it fails.
 */
export async function answerGoogleDriveRefresh(
  request: IGoogleDriveTokenRequest,
  body: unknown,
  refreshAccessToken: (refreshToken: string) => Promise<string | null | undefined>
): Promise<IGoogleDriveTokenAnswer> {
  const refusal = googleDriveTokenRequestRefusal(request);
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
