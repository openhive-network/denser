import { matrixUserId } from '@ui/config/chat';
import {
  MATRIX_ADMIN_TIMEOUT_MS,
  type MatrixAdminRequest,
  type MatrixCleanupFailureReporter,
  type MatrixDeviceCleanupSettings
} from '@smart-signer/lib/auth/matrix-devices';

export type MatrixLoginTokenSettings = Pick<MatrixDeviceCleanupSettings, 'homeserverUrl' | 'serverName' | 'adminToken'>;

/**
 * A login token (`m.login.token`) for the user; `unknown-user` when Synapse has no account for
 * them yet; `rate-limited` when Synapse refused with a 429, with the wait it asked for;
 * `failed` on any other trouble, reported first.
 */
export type MatrixLoginTokenResult =
  | { kind: 'token'; loginToken: string }
  | { kind: 'unknown-user' }
  | { kind: 'rate-limited'; retryAfterMs: number }
  | { kind: 'failed' };

/** How long the temporary access token the login token is minted with stays valid */
const TEMPORARY_SESSION_LIFETIME_MS = 60_000;

const NOT_FOUND = 404;
const TOO_MANY_REQUESTS = 429;
/** The wait on a 429 that names none: Synapse allows about one login token per user per minute */
const DEFAULT_RETRY_AFTER_MS = 60_000;
const MS_PER_SECOND = 1000;

/** The HTTP status of a failed request, as `fetchJson`'s `FetchError` carries it */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const { response } = error;
  return typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number'
    ? response.status
    : undefined;
}

/**
 * The wait a 429 asks for: Synapse's `retry_after_ms`, as `fetchJson`'s `FetchError` carries the
 * answer, else its `Retry-After` header in seconds
 */
function retryAfterMsOf(error: unknown): number {
  const data: unknown = typeof error === 'object' && error !== null ? Reflect.get(error, 'data') : undefined;
  const fromBody: unknown = typeof data === 'object' && data !== null ? Reflect.get(data, 'retry_after_ms') : undefined;
  if (typeof fromBody === 'number' && Number.isFinite(fromBody) && fromBody >= 0) return fromBody;
  const response: unknown = typeof error === 'object' && error !== null ? Reflect.get(error, 'response') : undefined;
  const header = response instanceof Response ? Number(response.headers.get('retry-after') ?? NaN) : NaN;
  return Number.isFinite(header) && header >= 0 ? header * MS_PER_SECOND : DEFAULT_RETRY_AFTER_MS;
}

function stringField(answer: unknown, field: string): string {
  const value: unknown = typeof answer === 'object' && answer !== null ? Reflect.get(answer, field) : undefined;
  if (typeof value !== 'string' || !value) throw new Error(`Synapse answered without ${field}`);
  return value;
}

function bearer(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function reasonOf(error: unknown, secrets: string[]): string {
  const reason = error instanceof Error ? error.message : String(error);
  return secrets.filter(Boolean).reduce((text, secret) => text.replaceAll(secret, '[redacted]'), reason);
}

/**
 * Mints a Synapse login token for `username` without a browser: the admin API logs in as the
 * user for a minute, that session asks for a login token (MSC3882, which Synapse serves with
 * `login_via_existing_session` enabled), and is then logged out, so it leaves no device. Each call
 * is bounded by `MATRIX_ADMIN_TIMEOUT_MS`. Nothing reported to `onFailure` contains a token.
 */
export async function mintMatrixLoginToken(
  username: string,
  settings: MatrixLoginTokenSettings,
  request: MatrixAdminRequest,
  onFailure: MatrixCleanupFailureReporter
): Promise<MatrixLoginTokenResult> {
  const userId = matrixUserId(username, settings);
  const secrets = [settings.adminToken];
  let temporaryToken = '';
  try {
    const login = await request(
      `${settings.homeserverUrl}/_synapse/admin/v1/users/${encodeURIComponent(userId)}/login`,
      {
        method: 'POST',
        headers: bearer(settings.adminToken),
        body: JSON.stringify({ valid_until_ms: Date.now() + TEMPORARY_SESSION_LIFETIME_MS })
      },
      MATRIX_ADMIN_TIMEOUT_MS
    );
    temporaryToken = stringField(login, 'access_token');
    secrets.push(temporaryToken);
    const answer = await request(
      `${settings.homeserverUrl}/_matrix/client/v1/login/get_token`,
      { method: 'POST', headers: bearer(temporaryToken), body: '{}' },
      MATRIX_ADMIN_TIMEOUT_MS
    );
    const loginToken = stringField(answer, 'login_token');
    secrets.push(loginToken);
    return { kind: 'token', loginToken };
  } catch (error) {
    if (!temporaryToken && statusOf(error) === NOT_FOUND) return { kind: 'unknown-user' };
    if (statusOf(error) === TOO_MANY_REQUESTS) return { kind: 'rate-limited', retryAfterMs: retryAfterMsOf(error) };
    onFailure(userId, `minting a login token: ${reasonOf(error, secrets)}`);
    return { kind: 'failed' };
  } finally {
    if (temporaryToken) {
      await request(
        `${settings.homeserverUrl}/_matrix/client/v3/logout`,
        { method: 'POST', headers: bearer(temporaryToken), body: '{}' },
        MATRIX_ADMIN_TIMEOUT_MS
      ).catch((error: unknown) =>
        onFailure(userId, `logging out the temporary session: ${reasonOf(error, secrets)}`)
      );
    }
  }
}
