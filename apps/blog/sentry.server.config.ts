// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@ui/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,

  // Only trace authenticated requests (those with account_info cookie).
  // Unauthenticated traffic (bots, crawlers, casual visitors) generates
  // thousands of unique SSR traces that accumulate Sentry span objects
  // in memory. Lab tests showed Sentry adds ~2.5 KB/req heap + ~7.5 KB/req
  // RSS under such traffic (see denser#886).
  tracesSampler: (samplingContext) => {
    const cookie = samplingContext.request?.headers?.cookie ?? '';
    if (cookie.split(';').some((c: string) => c.trim().startsWith('account_info='))) {
      return 1.0;
    }
    return 0;
  },

  // Enable structured logging API (Sentry.logger.*)
  enableLogs: true,

  // SECURITY: Disable PII collection by default for staging/production.
  // Set REACT_APP_SENTRY_SEND_PII=true for local development debugging only.
  // This prevents Sentry from capturing IP addresses, cookies, and headers.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: process.env.REACT_APP_SENTRY_SEND_PII === 'true',

  // SECURITY: Scrub WIF private keys from error events before sending to Sentry
  beforeSend: scrubEvent as any,
});
