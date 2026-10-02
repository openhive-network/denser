// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import env from "@beam-australia/react-env";
import { scrubEvent } from "@ui/lib/sentry-scrub";
import { parseTracesSampleRate } from "@ui/lib/sentry-sample-rate";

if (!!env('SENTRY_DSN')) {

Sentry.init({
  dsn: env('SENTRY_DSN'),

  // Replay is added lazily after page load (see loadReplayIntegration) to keep it out of the initial JS.

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
const loadReplayIntegration = async () => {
  const { replayIntegration } = await import("./lib/sentry-replay");
  Sentry.addIntegration(
    replayIntegration({
      // SECURITY: Mask all input fields to prevent capturing passwords/keys in session replays
      maskAllInputs: true,
    })
  );
};

if (document.readyState === 'complete') {
  void loadReplayIntegration();
} else {
  window.addEventListener('load', () => void loadReplayIntegration(), { once: true });
}

}

export const onRouterTransitionStart = !!env('SENTRY_DSN') ? Sentry.captureRouterTransitionStart : undefined;
