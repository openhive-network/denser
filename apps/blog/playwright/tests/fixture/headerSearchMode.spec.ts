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
 * Typing in the header's input leaves the page where it is (#1389): the 80 px
 * offset kept clear of the sticky header is a scroll-margin of the targets, as a
 * root scroll-padding it put the header's field in the band Chrome keeps a
 * caret out of, so each keystroke scrolled the page.
 *
 * The feed itself replays from `homeMainPage`; the next feed page the scroll
 * loads has no recording (a known miss). Replay-only: recording this spec
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
const WIDE = { width: 1400, height: 900 };
/** Down the feed, then back up a little so the header shows again, as a reader does */
const SCROLL_DOWN_PX = 800;
const SCROLL_BACK_PX = 100;
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

/** The page's scroll offset once a frame has painted, so a scroll a keystroke caused has happened */
const scrollYAfterPaint = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.scrollY)))
      )
  );

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

  test('HDR-SEARCH-03 — typing in the header search input does not scroll the page', async ({ page }) => {
    await page.setViewportSize(WIDE);
    await serveHiveSenseProbe(page, AI_OFF_RESPONSE);
    const homePage = new HomePage(page);
    await homePage.goto();
    const input = headerSearchInput(page, CLASSIC_PLACEHOLDER);
    await expect(input).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });

    await page.mouse.wheel(0, SCROLL_DOWN_PX);
    await expect.poll(() => scrollYAfterPaint(page)).toBe(SCROLL_DOWN_PX);
    await page.mouse.wheel(0, -SCROLL_BACK_PX);
    await expect.poll(() => scrollYAfterPaint(page)).toBe(SCROLL_DOWN_PX - SCROLL_BACK_PX);
    await expect
      .poll(() => page.getByRole('banner').evaluate((header) => header.getBoundingClientRect().top))
      .toBe(0);

    await input.click();
    const focusedY = await scrollYAfterPaint(page);
    for (const key of ['h', 'i', 'v']) {
      await page.keyboard.type(key);
      expect(await scrollYAfterPaint(page)).toBe(focusedY);
    }
    await page.keyboard.press('Backspace');
    expect(await scrollYAfterPaint(page)).toBe(focusedY);
    await expect(input).toHaveValue('hi');
  });
});
