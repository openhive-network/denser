// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import env from "@beam-australia/react-env";
import { deferSentryLoad } from "@ui/lib/sentry-deferred-load";

type CaptureRouterTransitionStart = typeof import("@sentry/nextjs").captureRouterTransitionStart;

const sentryEnabled = !!env('SENTRY_DSN');
let captureRouterTransitionStart: CaptureRouterTransitionStart | undefined;

// The SDK is loaded through a dynamic import() so that deployments without a DSN neither download nor evaluate it,
// and only a few seconds after the page has loaded, once it is idle, so that it adds no work to the page load.
// Errors raised before then are collected and reported once it is initialised.
const loadSentry = async (stopBufferingEarlyErrors: () => unknown[]) => {
  try {
    const { initSentry } = await import("./lib/sentry-init");
    captureRouterTransitionStart = initSentry(stopBufferingEarlyErrors());
  } finally {
    stopBufferingEarlyErrors();
  }
};

if (sentryEnabled) {
  deferSentryLoad((stopBufferingEarlyErrors) => void loadSentry(stopBufferingEarlyErrors));
}

// Router transitions that start before the SDK has loaded are not traced.
export const onRouterTransitionStart: CaptureRouterTransitionStart | undefined = sentryEnabled
  ? (...args) => captureRouterTransitionStart?.(...args)
  : undefined;
