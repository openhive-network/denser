import { FetchError, fetchJson } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { appApiPath } from '@ui/lib/app-api-path';
import { getLogger } from '@ui/lib/logging';
import type { LoginTokenAnswer } from '@/blog/features/matrix-chat/lib/matrix-chat-sign-in';

const logger = getLogger('app');

/** Within the session page's wait for a token, after which it signs in through SSO anyway */
const LOGIN_TOKEN_TIMEOUT_MS = 7_000;
const TOO_MANY_REQUESTS = 429;
/** The wait on a 429 that names none, as Synapse allows about one login token per user per minute */
const DEFAULT_RETRY_AFTER_MS = 60_000;
/** The longest wait honoured, the cap the route puts on Synapse's: a proxy may name a longer one */
const MAX_RETRY_AFTER_MS = 70_000;
const MS_PER_SECOND = 1000;

function field(answer: unknown, name: string): unknown {
  return typeof answer === 'object' && answer !== null ? Reflect.get(answer, name) : undefined;
}

const isWait = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** The wait a 429 names: its `retry_after_ms`, else its `Retry-After` in seconds, else a minute */
function namedRetryAfterMs(error: FetchError): number {
  const fromBody = field(error.data, 'retry_after_ms');
  if (isWait(fromBody)) return fromBody;
  const header = error.response.headers.get('retry-after');
  const seconds = header === null || header.trim() === '' ? NaN : Number(header);
  return isWait(seconds) ? seconds * MS_PER_SECOND : DEFAULT_RETRY_AFTER_MS;
}

const retryAfterMsOf = (error: FetchError): number => Math.min(namedRetryAfterMs(error), MAX_RETRY_AFTER_MS);

/**
 * A Matrix login token denser's server mints for the signed-in chat user, creating their Matrix
 * account first when it has none only with `createAccount`, which only an opened chat sets;
 * `rate-limited` on a 429, with the wait it names (`retry_after_ms`, else `Retry-After`, else a
 * minute), at most 70 s; `unreachable` when the request got
 * no answer, failing or timing out; `none` on any other answer.
 */
export async function requestMatrixLoginToken(createAccount: boolean): Promise<LoginTokenAnswer> {
  try {
    const answer: unknown = await fetchJson(
      appApiPath('/api/chat/matrix-login-token'),
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: [
          [csrfHeaderName, '1'],
          ['Content-Type', 'application/json']
        ],
        body: JSON.stringify({ createAccount })
      },
      LOGIN_TOKEN_TIMEOUT_MS
    );
    const loginToken = field(answer, 'loginToken');
    return typeof loginToken === 'string' ? { kind: 'token', loginToken } : { kind: 'none' };
  } catch (error) {
    if (!(error instanceof FetchError)) {
      const reason = error instanceof Error ? error.message : error;
      logger.warn('The Matrix login token request got no answer: %o', reason);
      return { kind: 'unreachable' };
    }
    if (error.response.status === TOO_MANY_REQUESTS) {
      return { kind: 'rate-limited', retryAfterMs: retryAfterMsOf(error) };
    }
    // Expected for a user without a Matrix account yet, before the chat is opened
    logger.info('No Matrix login token: %o', error instanceof Error ? error.message : error);
    return { kind: 'none' };
  }
}

/** `requestMatrixLoginToken`'s token, or null for none */
export async function fetchMatrixLoginToken(createAccount: boolean): Promise<string | null> {
  const answer = await requestMatrixLoginToken(createAccount);
  return answer.kind === 'token' ? answer.loginToken : null;
}
