import { getLogger } from '@ui/lib/logging';
import type { Connectivity } from './connectivity';

const logger = getLogger('app');

/**
 * How long code loaded on first use may take before the user is told it could not be loaded: on a
 * network that died silently the request hangs until the browser gives up, about a minute.
 */
export const CHUNK_LOAD_TIMEOUT_MS = 15_000;

/** Named as the bundlers name theirs, so error handling treats both alike (see `findChunkLoadError`). */
const chunkLoadError = (message: string, cause?: unknown): Error =>
  Object.assign(new Error(message, cause === undefined ? undefined : { cause }), { name: 'ChunkLoadError' });

export interface ILoadChunkOptions {
  connectivity?: Connectivity;
  timeoutMs?: number;
}

/**
 * Wraps the dynamic import `load` of code loaded on first use so it fails fast: at once while the
 * browser is offline and after `timeoutMs` when the network does not answer, with an error named
 * `ChunkLoadError`. After a failure the import is run once more when the connection is back, so the
 * next call finds the code loaded.
 */
export function createChunkLoader<T>(
  load: () => Promise<T>,
  { connectivity, timeoutMs = CHUNK_LOAD_TIMEOUT_MS }: ILoadChunkOptions = {}
): () => Promise<T> {
  let reloadPending = false;

  const reloadOnReconnect = () => {
    if (!connectivity || reloadPending) return;
    reloadPending = true;
    const stop = connectivity.onChange((connected) => {
      if (!connected) return;
      stop();
      reloadPending = false;
      load().catch((error: unknown) => logger.warn('Loading code again after reconnecting failed: %o', error));
    });
  };

  return async () => {
    if (connectivity?.isBrowserOffline()) {
      reloadOnReconnect();
      throw chunkLoadError('Not loading code while the browser is offline');
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(chunkLoadError(`Loading code took over ${timeoutMs} ms`)), timeoutMs);
    });
    try {
      return await Promise.race([load(), timeout]);
    } catch (error) {
      reloadOnReconnect();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
