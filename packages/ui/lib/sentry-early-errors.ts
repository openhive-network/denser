/**
 * Starts collecting uncaught errors and unhandled promise rejections, for the time before a lazily
 * loaded Sentry SDK has installed its own global handlers.
 *
 * Returns a function that stops collecting and returns what was collected. It may be called more
 * than once; later calls return the same errors.
 */
export const bufferEarlyErrors = (): (() => unknown[]) => {
  const errors: unknown[] = [];
  const onError = (event: ErrorEvent) => errors.push(event.error ?? event.message);
  const onUnhandledRejection = (event: PromiseRejectionEvent) => errors.push(event.reason);

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    return errors;
  };
};
