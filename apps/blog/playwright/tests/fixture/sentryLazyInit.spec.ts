import { test, expect } from '../support/fixture-proxy-test';

/**
 * The Sentry SDK is loaded through a dynamic import() only when a DSN is configured
 * (instrumentation-client.ts; initialChunks.spec.ts checks it is not in the initial
 * chunks). This checks that, with a DSN, it still loads, initialises and reports
 * an error thrown after the page has loaded, tagged with the deployment's environment
 * name (REACT_APP_SENTRY_ENVIRONMENT) and, as release, its revision (REACT_APP_GIT_COMMIT_SHA).
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
const ERROR_MESSAGE = 'PERF-SENTRY-01: error thrown after load';
const SENTRY_ENVIRONMENT = 'integration';
const GIT_COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
const INJECTED_ENV = {
  REACT_APP_SENTRY_DSN: SENTRY_DSN,
  REACT_APP_SENTRY_ENVIRONMENT: SENTRY_ENVIRONMENT,
  REACT_APP_GIT_COMMIT_SHA: GIT_COMMIT_SHA
};

test('PERF-SENTRY-01 — with a DSN, an error thrown after load reaches Sentry', async ({ page }) => {
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

  await page.goto('/trending', { waitUntil: 'load' });
  await page.evaluate((message) => {
    setTimeout(() => {
      throw new Error(message);
    });
  }, ERROR_MESSAGE);

  await expect
    .poll(() => envelopes.some((envelope) => envelope.includes(ERROR_MESSAGE)), { timeout: 20_000 })
    .toBe(true);
  const errorEnvelope = envelopes.find((envelope) => envelope.includes(ERROR_MESSAGE)) ?? '';
  expect(errorEnvelope).toContain(`"environment":"${SENTRY_ENVIRONMENT}"`);
  expect(errorEnvelope).toContain(`"release":"${GIT_COMMIT_SHA}"`);
});
