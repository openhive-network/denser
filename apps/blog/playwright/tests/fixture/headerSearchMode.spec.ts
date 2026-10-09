import fs from 'fs';
import path from 'path';
import type { Page, Route } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * The site header's search control follows the HiveSense availability probe
 * (`getHiveSenseStatus`, #947): the classic `Search...` input when the probe
 * fails, the AI search input when the OpenAPI root and the `posts/search` probe
 * both answer healthy.
 *
 * The probe goes to the AI domain, not the fixture proxy (see "The header's
 * HiveSense probe leaves the proxy" in CLAUDE.md), so both states are served
 * from the browser with recorded hivesense responses:
 *   - AI search off: `homeMainPage/0002`, the API's 404 for the hivesense root.
 *   - AI search on:  `lighthouse/0017` (the OpenAPI document) and
 *                    `lighthouse/0018` (a `posts/search` probe result).
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
const HIVESENSE_ROOT_PATH = '/hivesense-api/';
const HIVESENSE_SEARCH_PATH = '/hivesense-api/posts/search';
const CLASSIC_PLACEHOLDER = 'Search...';
const AI_PLACEHOLDER = 'AI Search...';

interface IRecordedRestResponse {
  response: unknown;
  responseStatus: number;
  responseContentType?: string;
}

const readRecording = (recording: string): IRecordedRestResponse =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES_ROOT, recording), 'utf-8'));

const AI_OFF_RESPONSES: Record<string, IRecordedRestResponse> = {
  [HIVESENSE_ROOT_PATH]: readRecording('homeMainPage/0002-GET_hivesense-api.json'),
  [HIVESENSE_SEARCH_PATH]: readRecording('homeMainPage/0002-GET_hivesense-api.json')
};

const AI_ON_RESPONSES: Record<string, IRecordedRestResponse> = {
  [HIVESENSE_ROOT_PATH]: readRecording('lighthouse/0017-GET_hivesense-api.json'),
  [HIVESENSE_SEARCH_PATH]: readRecording('lighthouse/0018-GET_hivesense-api_posts_search.json')
};

const fulfillWithRecording = (route: Route, recording: IRecordedRestResponse) =>
  route.fulfill({
    status: recording.responseStatus,
    contentType: recording.responseContentType ?? 'application/json',
    body: typeof recording.response === 'string' ? recording.response : JSON.stringify(recording.response),
    headers: { 'access-control-allow-origin': '*' }
  });

/**
 * Answers the two probe requests with `responses` and returns the set of probe
 * paths answered so far, so a test can wait until the header has its answer.
 */
async function serveHiveSenseProbe(page: Page, responses: Record<string, IRecordedRestResponse>) {
  const answered = new Set<string>();
  await page.route(
    (url) => url.pathname in responses,
    (route) => {
      const { pathname } = new URL(route.request().url());
      answered.add(pathname);
      return fulfillWithRecording(route, responses[pathname]);
    }
  );
  return answered;
}

const headerSearchInput = (page: Page, placeholder: string) =>
  page.getByRole('banner').getByPlaceholder(placeholder, { exact: true });

test.describe('Header search control follows the HiveSense probe', () => {
  test('HDR-SEARCH-01 — probe answers 404: the classic Search... input stays', async ({ page }) => {
    const answered = await serveHiveSenseProbe(page, AI_OFF_RESPONSES);
    const homePage = new HomePage(page);

    await homePage.goto();
    await expect
      .poll(() => answered.size, { timeout: TIMEOUTS.HYDRATION })
      .toBe(Object.keys(AI_OFF_RESPONSES).length);

    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toBeVisible();
    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toBeEnabled();
    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toHaveCount(0);
  });

  test('HDR-SEARCH-02 — probe answers healthy: the header switches to AI search', async ({ page }) => {
    const answered = await serveHiveSenseProbe(page, AI_ON_RESPONSES);
    const homePage = new HomePage(page);

    await homePage.goto();
    await expect
      .poll(() => answered.size, { timeout: TIMEOUTS.HYDRATION })
      .toBe(Object.keys(AI_ON_RESPONSES).length);

    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toBeVisible();
    await expect(headerSearchInput(page, AI_PLACEHOLDER)).toBeEnabled();
    await expect(headerSearchInput(page, CLASSIC_PLACEHOLDER)).toHaveCount(0);
  });
});
