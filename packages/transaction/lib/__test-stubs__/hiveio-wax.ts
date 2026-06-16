/**
 * Test stub for `@hiveio/wax`.
 *
 * The real package is ESM/`import`-only (its package.json `exports` define no
 * `require` condition), so it cannot be loaded by the CommonJS mocha + ts-node
 * runner. `wax-errors.ts` only needs the `WaxRequestError` class for an
 * `instanceof` check, so this minimal stand-in is enough — wax-errors' name-based
 * backstop covers the rest, which is what the unit tests exercise.
 *
 * Wired in via the `@hiveio/wax` path mapping in tsconfig.test.json +
 * tsconfig-paths/register (see .mocharc.yml).
 */
export class WaxRequestError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'WaxRequestError';
  }
}
