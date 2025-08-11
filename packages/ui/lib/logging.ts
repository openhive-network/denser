import pino, { Logger } from 'pino';
import env from '@beam-australia/react-env';

const isServer = typeof window === 'undefined';

export const logLevelData = {
  '*': isServer
    ? process.env.LOGGING_LOG_LEVEL?.toLowerCase() || 'info'
    : env('LOGGING_LOG_LEVEL')
      ? env('LOGGING_LOG_LEVEL').toLowerCase()
      : 'info'
};

export const logLevels = new Map<string, string>(Object.entries(logLevelData));

export function getLogLevel(logger: string): string {
  return logLevels.get(logger) || logLevels.get('*') || 'info';
}

/**
 * Get instance of pino logger.
 *
 * Use this way:
 * ```
 * import { getLogger } from "@ui/lib/logging";
 * const logger = getLogger('app');
 * logger.info("an info message from _app");
 * logger.info({username: 'John', id: 2}, "another info message from _app");
 * ```
 *
 * See https://github.com/pinojs/pino/blob/master/docs/api.md.
 * See https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/
 *
 * @export
 * @param {string} name
 * @returns {Logger}
 */
export function getLogger(name: string): Logger {
  const config = {
    name,
    level: getLogLevel(name),
    formatters: {
      level: (label: string) => {
        return { level: label.toUpperCase() };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime
  };

  if (!isServer) {
    return pino({
      ...config,
      browser: {
        disabled: env('LOGGING_BROWSER_ENABLED')
          ? env('LOGGING_BROWSER_ENABLED').toLowerCase() === 'true'
            ? false
            : true
          : true,
        asObject: false
      }
    });
  }

  // Server-side configuration
  return pino({
    ...config
  });
}

/**
 * Log a login event in the required format, including optional serialized auth proof.
 * @param ip - The user's IP address
 * @param authProof - The serialized login auth proof (Transaction base64), optional
 */
export function logLoginEvent(ip: string | undefined, username: string, loginType: string, loginChallenge: string) {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  let logLine = `${dateStr} -- /login_account --> ip=${ip} account=${username} login_type=${loginType} uuid=${loginChallenge}`;

  // Use the shared logger
  const logger = getLogger('login_account');
  logger.info(logLine);
}

/**
 * Log a logout event in the required format.
 * @param ip - The user's IP address
 * @param username - The username of the user who logged out
 * @param loginType - The login type that was used
 * @param uuid - The UUID (loginChallenge) from the cookie
 */
export function logLogoutEvent(ip: string | undefined, username: string, loginType: string, uuid: string) {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const logLine = `${dateStr} -- /logout --> ip=${ip} account=${username} login_type=${loginType} uuid=${uuid}`;
  // Use the shared logger
  const logger = getLogger('logout');
  logger.info(logLine);
}
