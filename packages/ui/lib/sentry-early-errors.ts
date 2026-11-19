/** What `captureMessage` takes besides the message: the event's level, tags and fingerprint. */
export interface SentryMessageContext {
  level: 'warning';
  tags: Record<string, string>;
  fingerprint: string[];
}

/**
 * A message to send with `captureMessage` rather than an error. `bufferHandledError` keeps it like an
 * error until the SDK loads; `captureEarlyErrors` then sends it as a message.
 */
export class SentryMessage {
  readonly message: string;
  readonly context: SentryMessageContext;

  constructor(message: string, context: SentryMessageContext) {
    this.message = message;
    this.context = context;
  }
}

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
 * Hands a caught error (or a `SentryMessage`) to the running `bufferEarlyErrors` collection, if there is one.
 * Returns false when nothing is collecting: the SDK is loaded, or there is no DSN.
 */
export const bufferHandledError = (error: unknown): boolean => {
  if (!collectHandledError) return false;
  collectHandledError(error);
  return true;
};

/** The SDK's two capture functions, as `captureEarlyErrors` uses them. */
interface SentryCapture {
  captureException: (error: unknown) => unknown;
  captureMessage: (message: string, context: SentryMessageContext) => unknown;
}

/** Sends what `bufferEarlyErrors` collected: each `SentryMessage` as a message, anything else as an exception. */
export const captureEarlyErrors = (earlyErrors: unknown[], { captureException, captureMessage }: SentryCapture): void => {
  earlyErrors.forEach((error) => {
    if (error instanceof SentryMessage) captureMessage(error.message, error.context);
    else captureException(error);
  });
};
