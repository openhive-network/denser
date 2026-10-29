import { test, expect } from '../support/fixture-proxy-test';
import {
  getBodyOnlySnippets,
  getExpectedCardSummaries,
  getInlineRscBytes,
  readRenderedCardSummaries
} from '../support/cardSummaries';

/**
 * Feed cards get their summaries from the server: the page carries each card's summary but not
 * the post bodies they are derived from, and the summaries read as they did when the client
 * derived them. initialChunks.spec.ts checks the summary renderer stays out of the initial JS;
 * cardSummariesProfile.spec.ts checks a profile list.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const MAX_INLINE_RSC_BYTES = 100 * 1024;
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
// Its metadata description is well-formed but has runs of spaces.
const DOUBLE_SPACED_POST = '@jack.russelle/tips-to-handing-the-police-with-a-motorbike-in-thailand';

test.describe('Feed card summaries (fixture-based)', () => {
  test('CARD-SUM-01 — /trending cards show the summaries derived from the recorded bodies', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('post-list-item')).toHaveCount(20);

    expect(await readRenderedCardSummaries(page)).toEqual(getExpectedCardSummaries('/trending'));
  });

  test('CARD-SUM-02 — the /trending HTML carries no post body and a small inline RSC payload', async ({
    request
  }) => {
    const response = await request.get('/trending');
    expect(response.status()).toBe(200);
    const html = await response.text();

    const snippets = getBodyOnlySnippets('homeMainPage', '0003-bridge.get_ranked_posts.json', '/trending');
    expect(snippets.length).toBeGreaterThanOrEqual(15);
    expect(snippets.filter((snippet) => html.includes(snippet))).toEqual([]);
    expect(getInlineRscBytes(html)).toBeLessThanOrEqual(MAX_INLINE_RSC_BYTES);
  });

  test('CARD-SUM-05 — a summary shows runs of spaces as one, within 3 lines on mobile and 1 on desktop', async ({
    page
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    const description = page.locator(`[data-testid="post-description"][href$="${DOUBLE_SPACED_POST}"]`);

    expect(await description.textContent()).toMatch(/ {2}/);
    expect(await description.innerText()).not.toMatch(/ {2}/);
    const lineCount = (box: { clientHeight: number; lineHeight: string }) =>
      Math.round(box.clientHeight / parseFloat(box.lineHeight));
    const measure = () =>
      description.evaluate((link) => {
        const card = link.parentElement;
        if (!card) throw new Error('post-description has no CardDescription');
        return { clientHeight: card.clientHeight, lineHeight: getComputedStyle(card).lineHeight };
      });
    expect(lineCount(await measure())).toBeLessThanOrEqual(3);

    await page.setViewportSize(DESKTOP_VIEWPORT);
    expect(lineCount(await measure())).toBe(1);
  });
});
