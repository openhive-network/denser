// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import env from "@beam-australia/react-env";
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@ui/lib/sentry-scrub";

if (!!env('SENTRY_DSN')) {

Sentry.init({
  dsn: env('SENTRY_DSN'),

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({
      // SECURITY: Mask all input fields to prevent capturing passwords/keys in session replays
      maskAllInputs: true,
    }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
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

}

export const onRouterTransitionStart = !!env('SENTRY_DSN') ? Sentry.captureRouterTransitionStart : undefined;
