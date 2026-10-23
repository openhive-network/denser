import type { User } from '@smart-signer/types/common';
import { matrixUserId, type ChatProvider } from '@ui/config/chat';
import type { ChatSessionEnder } from '@smart-signer/lib/auth/chat-session';

export interface MatrixDeviceCleanupSettings {
  provider: ChatProvider;
  /** Synapse's base URL, without a trailing slash */
  homeserverUrl: string;
  /** The part after `:` in Matrix user IDs */
  serverName: string;
  /** An access token of a Synapse admin; empty disables the cleanup */
  adminToken: string;
}

/** A JSON request to Synapse that rejects on a non-2xx answer or after `timeoutMs`, as `fetchJson` does. */
export type MatrixAdminRequest = (url: string, init: RequestInit, timeoutMs: number) => Promise<unknown>;

/** Reports a cleanup that failed. `reason` never contains the admin token. */
export type MatrixCleanupFailureReporter = (userId: string, reason: string) => void;

/** Bound on each admin API call; nobody waits on them. */
const MATRIX_ADMIN_TIMEOUT_MS = 5000;

function deviceIdsOf(answer: unknown): string[] {
  const devices: unknown = typeof answer === 'object' && answer !== null && 'devices' in answer ? answer.devices : [];
  if (!Array.isArray(devices)) return [];
  return devices.flatMap((device: unknown) =>
    typeof device === 'object' && device !== null && 'device_id' in device && typeof device.device_id === 'string'
      ? [device.device_id]
      : []
  );
}

async function deleteAllDevices(userId: string, settings: MatrixDeviceCleanupSettings, request: MatrixAdminRequest) {
  const userUrl = `${settings.homeserverUrl}/_synapse/admin/v2/users/${encodeURIComponent(userId)}`;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.adminToken}` };
  const devices = deviceIdsOf(await request(`${userUrl}/devices`, { method: 'GET', headers }, MATRIX_ADMIN_TIMEOUT_MS));
  if (devices.length === 0) return;
  await request(
    `${userUrl}/delete_devices`,
    { method: 'POST', headers, body: JSON.stringify({ devices }) },
    MATRIX_ADMIN_TIMEOUT_MS
  );
}

/**
 * Matrix's sessions: every device (with its access token) Synapse keeps for a user's Matrix
 * account, deleted through Synapse's admin API, since signing out of Element in the browser
 * leaves them on the server. Undefined unless Matrix is the chat provider and an admin token is set.
 */
export function matrixSessionEnder(
  settings: MatrixDeviceCleanupSettings,
  request: MatrixAdminRequest,
  onFailure: MatrixCleanupFailureReporter
): ChatSessionEnder | undefined {
  if (settings.provider !== 'matrix' || !settings.adminToken || !settings.homeserverUrl || !settings.serverName) {
    return undefined;
  }
  const userIdOf = (user: User) => (user.username ? matrixUserId(user.username, settings) : '');
  return {
    sessionOf: userIdOf,
    end: (user) => {
      const userId = userIdOf(user);
      deleteAllDevices(userId, settings, request).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        onFailure(userId, reason.replaceAll(settings.adminToken, '[redacted]'));
      });
    }
  };
}
