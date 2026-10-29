import { FetchError, fetchJson } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { appApiPath } from '@ui/lib/app-api-path';
import { getLogger } from '@ui/lib/logging';
import type { LoginTokenAnswer } from '@/blog/features/matrix-chat/lib/matrix-chat-sign-in';

const logger = getLogger('app');

/** Within the session page's wait for a token, after which it signs in through SSO anyway */
const LOGIN_TOKEN_TIMEOUT_MS = 7_000;
const TOO_MANY_REQUESTS = 429;

function field(answer: unknown, name: string): unknown {
  return typeof answer === 'object' && answer !== null ? Reflect.get(answer, name) : undefined;
}

/**
 * A Matrix login token denser's server mints for the signed-in chat user; `rate-limited` with the
 * wait the server names when Synapse refused a mint this soon; `none` on any other answer.
 */
export async function requestMatrixLoginToken(): Promise<LoginTokenAnswer> {
  try {
    const answer: unknown = await fetchJson(
      appApiPath('/api/chat/matrix-login-token'),
      { method: 'POST', credentials: 'same-origin', headers: [[csrfHeaderName, '1']] },
      LOGIN_TOKEN_TIMEOUT_MS
    );
    const loginToken = field(answer, 'loginToken');
    return typeof loginToken === 'string' ? { kind: 'token', loginToken } : { kind: 'none' };
  } catch (error) {
    if (error instanceof FetchError && error.response.status === TOO_MANY_REQUESTS) {
      const retryAfterMs = field(error.data, 'retry_after_ms');
      if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
        return { kind: 'rate-limited', retryAfterMs };
      }
    }
    // Expected for a user without a Matrix account yet; Element's SSO creates it
    logger.info('No Matrix login token: %o', error instanceof Error ? error.message : error);
    return { kind: 'none' };
  }
}

/** A Matrix login token denser's server mints for the signed-in chat user, or null for none */
export async function fetchMatrixLoginToken(): Promise<string | null> {
  const answer = await requestMatrixLoginToken();
  return answer.kind === 'token' ? answer.loginToken : null;
}
