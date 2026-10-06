import { test, expect } from '../support/fixture-proxy-test';

/**
 * The Sentry SDK is loaded through a dynamic import() only when a DSN is configured
 * (instrumentation-client.ts; initialChunks.spec.ts checks it is not in the initial
 * chunks). This checks that, with a DSN, it still loads, initialises and reports
 * an error thrown after the page has loaded.
 *
 * The DSN is injected into the page's __ENV.js. Its host is the fixture proxy, the
 * one origin the page's CSP `connect-src` admits; the SDK's envelope requests are
 * answered here and never reach the proxy.
 *
 * Reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const SENTRY_DSN = 'http://publickey@localhost:8200/1';
const SENTRY_ENVELOPE_URL = '**/api/1/envelope/**';
const ERROR_MESSAGE = 'PERF-SENTRY-01: error thrown after load';

test('PERF-SENTRY-01 — with a DSN, an error thrown after load reaches Sentry', async ({ page }) => {
  await page.route('**/__ENV.js*', async (route) => {
    const response = await route.fetch();
    const body = `${await response.text()}\nwindow.__ENV.REACT_APP_SENTRY_DSN = ${JSON.stringify(SENTRY_DSN)};\n`;
    await route.fulfill({ response, body });
  });

  const envelopes: string[] = [];
  await page.route(SENTRY_ENVELOPE_URL, async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/trending', { waitUntil: 'load' });
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(message);
    });
  }, ERROR_MESSAGE);

  await expect
    .poll(() => envelopes.some((envelope) => envelope.includes(ERROR_MESSAGE)), { timeout: 20_000 })
    .toBe(true);
});
