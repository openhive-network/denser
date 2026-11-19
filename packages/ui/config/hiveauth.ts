import type { ReadPublicEnv } from './chat';

export interface HiveAuthConfig {
  /** Whether the sign-in form offers HiveAuth, and the CSP admits its relay */
  enabled: boolean;
  /** The HAS relay's WebSocket URL, without a trailing slash */
  serverUrl: string;
}

/** The public HAS relay the HiveAuth sign-in has always used */
export const DEFAULT_HIVEAUTH_SERVER = 'wss://hive-auth.arcange.eu';

const DISABLED_VALUES = new Set(['no', 'false', 'off', '0']);

/** `HIVEAUTH_SERVER` as a `wss:` URL (a bare host is taken as one); the default when unset or not a `wss:` URL. */
function relayUrl(value: string | undefined): string {
  const text = value?.trim();
  if (!text) return DEFAULT_HIVEAUTH_SERVER;
  let url: URL;
  try {
    url = new URL(text.includes('://') ? text : `wss://${text}`);
  } catch {
    return DEFAULT_HIVEAUTH_SERVER;
  }
  if (url.protocol !== 'wss:' || url.search || url.hash) return DEFAULT_HIVEAUTH_SERVER;
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
}

/**
 * HiveAuth's settings: `HIVEAUTH_ENABLED` turns it off with `no` (also `false`, `off`, `0`) and is on
 * otherwise; `HIVEAUTH_SERVER` names the HAS relay, `DEFAULT_HIVEAUTH_SERVER` unless set.
 */
export function resolveHiveAuthConfig(read: ReadPublicEnv): HiveAuthConfig {
  const enabled = !DISABLED_VALUES.has(read('HIVEAUTH_ENABLED')?.trim().toLowerCase() ?? '');
  return { enabled, serverUrl: relayUrl(read('HIVEAUTH_SERVER')) };
}

/** The origin the page opens the relay's WebSocket to, for the CSP's `connect-src`; none when HiveAuth is off. */
export function hiveAuthConnectOrigins({ enabled, serverUrl }: HiveAuthConfig): string[] {
  return enabled ? [new URL(serverUrl).origin] : [];
}
