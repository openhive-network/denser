import pino, { Logger } from 'pino';
import env from '@beam-australia/react-env';

export const logLevelData = {
  '*': env('LOGGING_LOG_LEVEL') ? env('LOGGING_LOG_LEVEL').toLowerCase() : 'info'
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
 * import { getLogger } from "@hive/logger";
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
  return pino({
    name,
    level: getLogLevel(name),
    formatters: {
      level: (label: string) => {
        return { level: label.toUpperCase() };
      }
    },
    timestamp: pino.stdTimeFunctions.isoTime,
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


export interface LoggerLogLevels {
    off: number,
    fatal: number,
    error: number,
    warn:  number,
    info:  number,
    debug: number,
    trace: number,
    all: number,
};

export type LoggerOutput = 'console' | 'noop';

/**
 * Utility function for testing whether we are in browser.
 *
 */
export const isBrowser = () => typeof window !== 'undefined' && window;

// For fancy log messages.
const commonStyle = [
    'padding: 1px; padding-right: 4px; font-family: "Helvetica";',
    'border-left: 3px solid #0a2722;',
];
export const loggerStyles = {
    slimConstructor: [
            'color: white;',
            'background-color: #276156;',
            ...commonStyle,
        ].join(' '),
    slimDestructor: [
            'color: black;',
            'background-color: rgb(255, 180, 0);',
            ...commonStyle,
        ].join(' '),
    slimFatal: [
            'color: white;',
            'background-color: rgb(0, 0, 0);',
            ...commonStyle,
        ].join(' '),
    slimError: [
            'color: white;',
            'background-color: rgb(255, 80, 80);',
            ...commonStyle,
        ].join(' '),
    slimWarn: [
            'color: black;',
            'background-color: rgb(255, 255, 153);',
            ...commonStyle,
        ].join(' '),
    slimInfo: [
            'color: white;',
            'background-color: rgb(55,105,150);',
            ...commonStyle,
        ].join(' '),
    slimDebug: [
            'color: black;',
            'background-color: rgb(153, 255, 204);',
            ...commonStyle,
        ].join(' '),
};
