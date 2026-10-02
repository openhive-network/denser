// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import env from "@beam-australia/react-env";
import { captureRouterTransitionStart, init } from "@sentry/nextjs";
import { scrubEvent } from "@ui/lib/sentry-scrub";
import { parseTracesSampleRate } from "@ui/lib/sentry-sample-rate";

if (!!env('SENTRY_DSN')) {

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

// The replay sample rates above apply once the integration is added; replays only start after that point.
// Only the dynamic import() may reference the replay module: a static import would put rrweb back in the initial chunks.
const loadReplayIntegration = async () => {
  const { addReplayIntegration } = await import("./lib/sentry-replay");
  addReplayIntegration();
};

const scheduleReplayIntegration = () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => void loadReplayIntegration());
  } else {
    setTimeout(() => void loadReplayIntegration(), 0);
  }
};

if (document.readyState === 'complete') {
  scheduleReplayIntegration();
} else {
  window.addEventListener('load', scheduleReplayIntegration, { once: true });
}

}

export const onRouterTransitionStart = !!env('SENTRY_DSN') ? captureRouterTransitionStart : undefined;
