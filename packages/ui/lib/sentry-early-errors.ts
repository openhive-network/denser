let collectHandledError: ((error: unknown) => void) | undefined;

/**
 * Starts collecting uncaught errors, unhandled promise rejections and errors passed to
 * `bufferHandledError`, for the time before a lazily loaded Sentry SDK has installed its own
 * global handlers.
 *
 * Returns a function that stops collecting and returns what was collected. It may be called more
 * than once; later calls return the same errors.
 */
export const bufferEarlyErrors = (): (() => unknown[]) => {
  const errors: unknown[] = [];
  const collect = (error: unknown) => errors.push(error);
  const onUncaughtError = (event: ErrorEvent) => collect(event.error ?? event.message);
  const onUnhandledRejection = (event: PromiseRejectionEvent) => collect(event.reason);

  window.addEventListener('error', onUncaughtError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  collectHandledError = collect;

  return () => {
    window.removeEventListener('error', onUncaughtError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    if (collectHandledError === collect) collectHandledError = undefined;
    return errors;
  };
};

/**
 * Hands a caught error to the running `bufferEarlyErrors` collection, if there is one.
 * Returns false when nothing is collecting: the SDK is loaded, or there is no DSN.
 */
export const bufferHandledError = (error: unknown): boolean => {
  if (!collectHandledError) return false;
  collectHandledError(error);
  return true;
};
