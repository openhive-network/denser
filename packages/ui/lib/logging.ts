import pino, { Logger } from "pino";
import env from "@beam-australia/react-env";

export const logLevelData = {
    "*": env('LOGGING_LOG_LEVEL') ? env('LOGGING_LOG_LEVEL').toLowerCase() : 'info',
};

export const logLevels = new Map<string, string>(Object.entries(logLevelData));

export function getLogLevel(logger: string): string {
    return logLevels.get(logger) || logLevels.get("*") || "info";
}

/**
 * Get instance of pino logger.
 *
 * Use this way:
 * ```
 * import { getLogger } from "@hive/ui/lib/logging";
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
        useLevelLabels: true,
        formatters: {
            level: (label: string) => {
                return { level: label.toUpperCase() };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        browser: {
            disabled: env('LOGGING_BROWSER_ENABLED') ?
                env('LOGGING_BROWSER_ENABLED').toLowerCase() === 'true' ?
                    false
                    : true
                : true,
            asObject: false,
        }
    });
}
