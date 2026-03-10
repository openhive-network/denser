// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@ui/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // SECURITY: Disable PII collection by default for staging/production.
  // Set REACT_APP_SENTRY_SEND_PII=true for local development debugging only.
  // This prevents Sentry from capturing IP addresses, cookies, and headers.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: process.env.REACT_APP_SENTRY_SEND_PII === 'true',

  // SECURITY: Scrub WIF private keys from error events before sending to Sentry
  beforeSend: scrubEvent as any,
});
