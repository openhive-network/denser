import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HealthcheckerPage } from '../support/pages/healthcheckerPage';

/**
 * /healthchecker renders the API provider switch from @hiveio/healthchecker-component.
 * A component build that bundles its own React JSX runtime throws during module
 * evaluation under the app's React and the route answers 500; a broken client
 * bundle surfaces as a page or console error instead. Both fail here.
 *
 * The component probes its providers (public API nodes) only once "Continuous
 * Check" is started, so loading the page makes no probe. Were it to start
 * probing on load, the page's CSP (connect-src is the fixture proxy) would block
 * the requests and the console assertion below would report them.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright test --config=playwright.fixture.config.ts healthchecker
 * Replay:  pnpm --filter @hive/blog test:fixture -- healthchecker
 */

test.use({ fixtureTestName: 'healthchecker' });

test.describe('Healthchecker page — renders under the app React', () => {
  test('HC-01 — /healthchecker answers 200 and renders the provider switch with no errors', async ({
    page
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`);
    });
    const healthcheckerPage = new HealthcheckerPage(page);

    const response = await page.goto('/healthchecker');
    expect(response?.status()).toBe(200);

    await expect(healthcheckerPage.pageTitle).toHaveText('API switch and HealthChecker');
    await expect(healthcheckerPage.hiveApiTab).toBeVisible();
    await expect(healthcheckerPage.hiveSenseApiTab).toBeVisible();
    await expect(healthcheckerPage.healthCheckerComponent).toBeVisible();
    await expect(page.getByTestId('hc-set-api-button').first()).toBeVisible();

    await healthcheckerPage.switchToHiveSenseTab();
    await healthcheckerPage.validateHiveSenseTabIsActive();
    await expect(healthcheckerPage.healthCheckerComponent).toBeVisible();
    await expect(page.getByTestId('hc-set-api-button').first()).toBeVisible();

    // Let the client settle so late errors (effects, lazy chunks) are caught;
    // capped because the page may keep polling and never go fully idle.
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    if (isRecordMode) return;
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
