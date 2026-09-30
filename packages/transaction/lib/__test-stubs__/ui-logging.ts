/**
 * Test stub for `@hive/ui/lib/logging` / `@ui/lib/logging`.
 *
 * The real module pulls in pino and runtime env config; unit tests only need a
 * logger-shaped object, so every level is a no-op.
 */
const noop = (..._args: unknown[]): void => undefined;

const logger = { trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };

export const getLogger = (_name?: string) => logger;
