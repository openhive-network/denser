import { fetchJson } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { appApiPath } from '@ui/lib/app-api-path';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/** Within the session page's wait for a token, after which it signs in through SSO anyway */
const LOGIN_TOKEN_TIMEOUT_MS = 7_000;

/** A Matrix login token denser's server mints for the signed-in chat user, or null for none */
export async function fetchMatrixLoginToken(): Promise<string | null> {
  try {
    const answer: unknown = await fetchJson(
      appApiPath('/api/chat/matrix-login-token'),
      { method: 'POST', credentials: 'same-origin', headers: [[csrfHeaderName, '1']] },
      LOGIN_TOKEN_TIMEOUT_MS
    );
    const loginToken = typeof answer === 'object' && answer !== null ? Reflect.get(answer, 'loginToken') : null;
    return typeof loginToken === 'string' ? loginToken : null;
  } catch (error) {
    // Expected for a user without a Matrix account yet; Element's SSO creates it
    logger.info('No Matrix login token: %o', error instanceof Error ? error.message : error);
    return null;
  }
}
