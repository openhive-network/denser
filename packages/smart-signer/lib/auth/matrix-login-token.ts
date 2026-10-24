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
 * them yet; `failed` on any other trouble, reported first.
 */
export type MatrixLoginTokenResult =
  | { kind: 'token'; loginToken: string }
  | { kind: 'unknown-user' }
  | { kind: 'failed' };

/** How long the temporary access token the login token is minted with stays valid */
const TEMPORARY_SESSION_LIFETIME_MS = 60_000;

const NOT_FOUND = 404;

/** The HTTP status of a failed request, as `fetchJson`'s `FetchError` carries it */
function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const { response } = error;
  return typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number'
    ? response.status
    : undefined;
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
