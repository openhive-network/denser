import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';

/**
 * The Sentry SDK is loaded through a dynamic import() only when a DSN is configured
 * (instrumentation-client.ts; initialChunks.spec.ts checks it is not in the initial
 * chunks), and only a few seconds after the page has loaded, once it is idle
 * (@ui/lib/sentry-deferred-load). These check that, with a DSN, an error thrown after the page
 * has loaded is reported both before the SDK has loaded and after, tagged with the deployment's
 * environment name (REACT_APP_SENTRY_ENVIRONMENT) and, as release, its revision
 * (REACT_APP_GIT_COMMIT_SHA).
 *
 * The DSN and both tags are injected into the page's __ENV.js. Its host is the fixture proxy, the
 * one origin the page's CSP `connect-src` admits; the SDK's envelope requests are
 * answered here and never reach the proxy.
 *
 * Reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const SENTRY_DSN = 'http://publickey@localhost:8200/1';
const SENTRY_ENVELOPE_URL = '**/api/1/envelope/**';
const SENTRY_ENVIRONMENT = 'integration';
const GIT_COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
const INJECTED_ENV = {
  REACT_APP_SENTRY_DSN: SENTRY_DSN,
  REACT_APP_SENTRY_ENVIRONMENT: SENTRY_ENVIRONMENT,
  REACT_APP_GIT_COMMIT_SHA: GIT_COMMIT_SHA
};
// The deferred load waits 5 s after `load`, then for an idle main thread (at most 5 s more).
const SDK_IDLE_LOAD_TIMEOUT_MS = 20_000;
const ENVELOPE_TIMEOUT_MS = 20_000;

/** Injects the DSN and answers the SDK's envelope requests; returns the envelopes sent so far. */
const captureSentryEnvelopes = async (page: Page): Promise<string[]> => {
  await page.route('**/__ENV.js*', async (route) => {
    const response = await route.fetch();
    const body = `${await response.text()}\nObject.assign(window.__ENV, ${JSON.stringify(INJECTED_ENV)});\n`;
    await route.fulfill({ response, body });
  });

  const envelopes: string[] = [];
  await page.route(SENTRY_ENVELOPE_URL, async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return envelopes;
};

const isSdkLoaded = (page: Page) => page.evaluate(() => '__SENTRY__' in window);

const throwUncaught = (page: Page, message: string) =>
  page.evaluate((errorMessage) => {
    setTimeout(() => {
      throw new Error(errorMessage);
    });
  }, message);

const expectErrorReported = async (envelopes: string[], message: string, timeout = ENVELOPE_TIMEOUT_MS) => {
  await expect.poll(() => envelopes.some((envelope) => envelope.includes(message)), { timeout }).toBe(true);
  const errorEnvelope = envelopes.find((envelope) => envelope.includes(message)) ?? '';
  expect(errorEnvelope).toContain(`"environment":"${SENTRY_ENVIRONMENT}"`);
  expect(errorEnvelope).toContain(`"release":"${GIT_COMMIT_SHA}"`);
};

test('PERF-SENTRY-01 — with a DSN, an error thrown after load, before the SDK has loaded, reaches Sentry', async ({
  page
}) => {
  test.setTimeout(SDK_IDLE_LOAD_TIMEOUT_MS + ENVELOPE_TIMEOUT_MS + 30_000);
  const message = 'PERF-SENTRY-01: error thrown after load';
  const envelopes = await captureSentryEnvelopes(page);

  await page.goto('/trending', { waitUntil: 'load' });
  expect(await isSdkLoaded(page)).toBe(false);
  await throwUncaught(page, message);

  // Collected until the deferred load, then reported.
  await expectErrorReported(envelopes, message, SDK_IDLE_LOAD_TIMEOUT_MS + ENVELOPE_TIMEOUT_MS);
});

test('PERF-SENTRY-02 — with a DSN, the SDK loads only after the page has loaded and gone idle, then reports errors', async ({
  page
}) => {
  test.setTimeout(SDK_IDLE_LOAD_TIMEOUT_MS + ENVELOPE_TIMEOUT_MS + 30_000);
  const message = 'PERF-SENTRY-02: error thrown after the SDK has loaded';
  const envelopes = await captureSentryEnvelopes(page);

  await page.goto('/trending', { waitUntil: 'load' });
  expect(await isSdkLoaded(page)).toBe(false);
  expect(envelopes).toEqual([]);

  // Initialising, the SDK starts a session and sends it.
  await expect
    .poll(() => envelopes.some((envelope) => envelope.includes('"type":"session"')), {
      timeout: SDK_IDLE_LOAD_TIMEOUT_MS
    })
    .toBe(true);
  expect(await isSdkLoaded(page)).toBe(true);
  await throwUncaught(page, message);

  await expectErrorReported(envelopes, message);
});
