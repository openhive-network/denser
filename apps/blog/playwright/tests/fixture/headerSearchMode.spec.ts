import fs from 'fs';
import path from 'path';
import type { Page, Route } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * The site header's search control follows the HiveSense availability probe
 * (`getHiveSenseStatus`, #947): the classic `Search...` input when the probe
 * fails, the AI search input when `/hivesense-api/sync-status` reports a
 * processed block. The probe is that one request: no OpenAPI root fetch and no
 * `posts/search` call (#1365).
 *
 * The probe goes to the AI domain, not the fixture proxy (see "The header's
 * HiveSense probe leaves the proxy" in CLAUDE.md), so both states are served
 * from the browser with recorded hivesense responses:
 *   - AI search off: `homeMainPage/0002`, the API's 404 for the hivesense root.
 *   - AI search on:  `lighthouse/0017`, a `sync-status` answer.
 *
 * The feed itself replays from `homeMainPage`. Replay-only: recording this spec
 * would overwrite that directory.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- headerSearchMode
 */

test.use({ fixtureTestName: 'homeMainPage' });
test.skip(
  isRecordMode,
  'replay-only: reuses the homeMainPage recording and serves hivesense from recordings'
);

const FIXTURES_ROOT = path.resolve(__dirname, '..', 'mock', 'fixtures');
const HIVESENSE_SYNC_STATUS_PATH = '/hivesense-api/sync-status';
const CLASSIC_PLACEHOLDER = 'Search...';
const AI_PLACEHOLDER = 'AI Search...';

interface IRecordedRestResponse {
  response: unknown;
  responseStatus: number;
  responseContentType?: string;
}

const readRecording = (recording: string): IRecordedRestResponse =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES_ROOT, recording), 'utf-8'));

const AI_OFF_RESPONSE = readRecording('homeMainPage/0002-GET_hivesense-api.json');
const AI_ON_RESPONSE = readRecording('lighthouse/0017-GET_hivesense-api_sync-status.json');

const fulfillWithRecording = (route: Route, recording: IRecordedRestResponse) =>
  route.fulfill({
    status: recording.responseStatus,
    contentType: recording.responseContentType ?? 'application/json',
    body: typeof recording.response === 'string' ? recording.response : JSON.stringify(recording.response),
    headers: { 'access-control-allow-origin': '*' }
  });

/**
 * Answers the `sync-status` probe with `recording` and returns the paths of every
 * hivesense request the page made so far, so a test can wait until the header
 * has its answer and check nothing else was asked.
 */
async function serveHiveSenseProbe(page: Page, recording: IRecordedRestResponse) {
  const hiveSensePaths: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/hivesense-api')) hiveSensePaths.push(pathname);
  });
  await page.route(
    (url) => url.pathname === HIVESENSE_SYNC_STATUS_PATH,
    (route) => fulfillWithRecording(route, recording)
  );
  return hiveSensePaths;
}

const headerSearchInput = (page: Page, placeholder: string) =>
  page.getByRole('banner').getByPlaceholder(placeholder, { exact: true });

test.describe('Header search control follows the HiveSense probe', () => {
  test('HDR-SEARCH-01 — probe answers 404: the classic Search... input stays', async ({ page }) => {
    const hiveSensePaths = await serveHiveSenseProbe(page, AI_OFF_RESPONSE);
    const homePage = new HomePage(page);

    await homePage.goto();
    await expect
      .poll(() => hiveSensePaths, { timeout: TIMEOUTS.HYDRATION })
      .toEqual([HIVESENSE_SYNC_STATUS_PATH]);

    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toBeVisible();
    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toBeEnabled();
    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toHaveCount(0);
    expect(hiveSensePaths).toEqual([HIVESENSE_SYNC_STATUS_PATH]);
  });

  test('HDR-SEARCH-02 — probe answers healthy: the header switches to AI search', async ({ page }) => {
    const hiveSensePaths = await serveHiveSenseProbe(page, AI_ON_RESPONSE);
    const homePage = new HomePage(page);

    await homePage.goto();
    await expect
      .poll(() => hiveSensePaths, { timeout: TIMEOUTS.HYDRATION })
      .toEqual([HIVESENSE_SYNC_STATUS_PATH]);

    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toBeVisible();
    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toBeEnabled();
    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toHaveCount(0);
    expect(hiveSensePaths).toEqual([HIVESENSE_SYNC_STATUS_PATH]);
  });
});
