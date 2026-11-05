/** The name webpack's and Turbopack's runtimes give the error of a script chunk that could not be loaded. */
const CHUNK_LOAD_ERROR_NAME = 'ChunkLoadError';

const MAX_CAUSE_DEPTH = 5;

/**
 * The bundler's chunk load failure that is `error` or, a few levels deep, its `cause`: code loaded on
 * first use (the signing stack, a verification module) could not be fetched, mostly because the
 * browser is offline. It says nothing about the operation or the key being used.
 */
export function findChunkLoadError(error: unknown): Error | undefined {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (current.name === CHUNK_LOAD_ERROR_NAME) return current;
    current = current.cause;
  }
  return undefined;
}
