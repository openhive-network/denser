import type { MatrixSdkLogger } from './sdk-logger-type.ts';

/** Where the Matrix client's log lines go, printf-style */
export interface MatrixLogSink {
  debug: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const FORMAT = 'Matrix chat: %o';
/** The SDK's errors for a request cut off before its answer, as the browser does unloading a page */
const CUT_OFF_REQUEST_ERRORS: ReadonlySet<string> = new Set(['ConnectionError', 'AbortError']);
const ignore = () => undefined;

const reportsCutOffRequest = (message: unknown[]) =>
  message.some((part) => part instanceof Error && CUT_OFF_REQUEST_ERRORS.has(part.name));

/**
 * The Matrix client's logger: its errors go to `sink` as errors, its warnings and info at debug
 * (the SDK warns about routine things, such as the push rules it adds), the rest is dropped.
 *
 * Once `page` (the window) fires `beforeunload` or `pagehide`, an error about a request that was
 * cut off goes to debug too: the page going away ends the client's long-poll `/sync`, which the
 * SDK reports as a failed sync. A `pageshow` (back from the back/forward cache) ends that. A
 * `beforeunload` the user cancels leaves it in place, for cut-off requests only.
 */
export function createMatrixSdkLogger(sink: MatrixLogSink, page?: EventTarget): MatrixSdkLogger {
  let unloading = false;
  const markUnloading = () => {
    unloading = true;
  };
  page?.addEventListener('beforeunload', markUnloading);
  page?.addEventListener('pagehide', markUnloading);
  page?.addEventListener('pageshow', () => {
    unloading = false;
  });

  const logger: MatrixSdkLogger = {
    trace: ignore,
    debug: ignore,
    info: (...message: unknown[]) => sink.debug(FORMAT, message),
    warn: (...message: unknown[]) => sink.debug(FORMAT, message),
    error: (...message: unknown[]) => {
      if (unloading && reportsCutOffRequest(message)) sink.debug(FORMAT, message);
      else sink.error(FORMAT, message);
    },
    getChild: () => logger
  };
  return logger;
}
