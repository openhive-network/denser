import pino, {Logger} from 'pino';

// CSP-safe environment detection (no Function() constructor)
const isServer = typeof window === 'undefined';

function getLogLevel(): string {
    if (isServer) {
        return process.env.REACT_APP_LOGGING_LOG_LEVEL?.toLowerCase() || 'info';
    }
    // In browser, check window for env variable (may be set by build process)
    const win = window as unknown as Record<string, string | undefined>;
    return win.REACT_APP_LOGGING_LOG_LEVEL?.toLowerCase() || 'info';
}

let loggerInstance: Logger | null = null;

function getLogger(): Logger {
    if (!loggerInstance) {
        loggerInstance = pino({
            name: '@hiveio/content-renderer',
            level: getLogLevel(),
            formatters: {
                level: (label: string) => ({level: label.toUpperCase()})
            },
            timestamp: pino.stdTimeFunctions.isoTime,
            browser: {
                // In browser: disabled by default, asObject: false preserves all arguments
                disabled: isServer ? false : true,
                asObject: false
            }
        });
    }
    return loggerInstance;
}

// Export compatible interface: Log.log().error(), Log.log().warn(), Log.log().debug()
export const Log = {
    log: getLogger
};
