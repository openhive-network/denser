import { bufferEarlyErrors } from './sentry-early-errors';

// After `load` a page still hydrates, fetches and paints for a while; Lighthouse keeps its trace
// open until the page has been quiet after `load`. Loading the SDK this long after `load` keeps
// its evaluation and setup out of that window on a mobile CPU.
const SENTRY_LOAD_DELAY_MS = 5_000;
// The longest the load then waits for an idle main thread.
const IDLE_TIMEOUT_MS = 5_000;

const afterPageLoad = (callback: () => void) => {
  if (document.readyState === 'complete') callback();
  else window.addEventListener('load', callback, { once: true });
};

const whenIdle = (callback: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(callback, 0);
};

/**
 * Calls `load` once, off the page load: SENTRY_LOAD_DELAY_MS after `load`, when the main thread is
 * idle. Errors raised until then are collected (bufferEarlyErrors), not loaded for: an error during
 * the page load (a recoverable hydration error, say) would otherwise pull the SDK back into it.
 * `load` gets the function that stops collecting and returns them.
 */
export const deferSentryLoad = (load: (stopBufferingEarlyErrors: () => unknown[]) => void): void => {
  const stopBufferingEarlyErrors = bufferEarlyErrors();
  afterPageLoad(() => setTimeout(() => whenIdle(() => load(stopBufferingEarlyErrors)), SENTRY_LOAD_DELAY_MS));
};
