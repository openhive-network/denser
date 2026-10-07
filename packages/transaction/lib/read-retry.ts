import { ReadTransportError } from './read-transport';

/** Pause before the repeated request: a node often answers a query it has just run much faster. */
export const READ_RETRY_DELAY_MS = 1_000;

export interface IReadRetryOptions {
  delayMs?: number;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A timeout, a network failure or a 5xx: worth asking again. A 4xx or an API answer is not. */
const isTransientReadFailure = (error: unknown): boolean =>
  error instanceof ReadTransportError && (error.status === undefined || error.status >= 500);

/**
 * Runs `read`, and when it fails with a transient transport failure (see `isTransientReadFailure`)
 * runs it once more after `delayMs`. Rejects with the error of the last attempt.
 */
export async function retryReadOnce<T>(
  read: () => Promise<T>,
  { delayMs = READ_RETRY_DELAY_MS, sleep = defaultSleep }: IReadRetryOptions = {}
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isTransientReadFailure(error)) throw error;
    await sleep(delayMs);
    return read();
  }
}
