// Loaded only through a dynamic import(), and only when a DSN is configured, so the Sentry SDK stays out of the initial chunks.
import env from "@beam-australia/react-env";
import { captureException, captureRouterTransitionStart, init } from "@sentry/nextjs";
import { scrubEvent } from "@ui/lib/sentry-scrub";
import { parseTracesSampleRate } from "@ui/lib/sentry-sample-rate";

// The replay sample rates in initSentry apply once the integration is added; replays only start after that point.
// Only the dynamic import() may reference the replay module: a static import would put rrweb back in the initial chunks.
const loadReplayIntegration = async () => {
  const { addReplayIntegration } = await import("./sentry-replay");
  addReplayIntegration();
};

const scheduleReplayIntegration = () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void loadReplayIntegration());
  } else {
    setTimeout(() => void loadReplayIntegration(), 0);
  }
};

/**
 * Initialises the Sentry SDK, reports `earlyErrors` (raised before the SDK was loaded) and schedules
 * Session Replay. Returns the handler for Next.js router transitions.
 */
export const initSentry = (earlyErrors: unknown[]) => {
  init({
    dsn: env('SENTRY_DSN'),

    // Replay is added once the page has loaded and gone idle (see scheduleReplayIntegration), to keep it out of the initial JS.

    // Define how likely traces are sampled. Set REACT_APP_SENTRY_TRACES_SAMPLE_RATE to override (default 0.1).
    tracesSampleRate: parseTracesSampleRate(env('SENTRY_TRACES_SAMPLE_RATE')),
    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Define how likely Replay events are sampled.
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // Define how likely Replay events are sampled when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // SECURITY: Disable PII collection by default for staging/production.
    // Set SENTRY_SEND_PII=true for local development debugging only.
    // This prevents Sentry from capturing IP addresses, cookies, and headers.
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: env('SENTRY_SEND_PII') === 'true',

    // SECURITY: Scrub WIF private keys from error events before sending to Sentry
    beforeSend: scrubEvent as any,
  });

  earlyErrors.forEach((error) => captureException(error));

  if (document.readyState === 'complete') {
    scheduleReplayIntegration();
  } else {
    window.addEventListener('load', scheduleReplayIntegration, { once: true });
  }

  return captureRouterTransitionStart;
};
