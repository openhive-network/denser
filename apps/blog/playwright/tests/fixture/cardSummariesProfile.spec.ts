import { test, expect } from '../support/fixture-proxy-test';
import { getBodyOnlySnippets, getExpectedCardSummaries, readRenderedCardSummaries } from '../support/cardSummaries';

/** A profile post list gets its card summaries from the server, as feeds do (see cardSummaries.spec.ts). */

test.use({ fixtureTestName: 'userProfileTabs' });

test.describe('Profile card summaries (fixture-based)', () => {
  test('CARD-SUM-03 — /@hiveio/posts cards show the summaries derived from the recorded bodies', async ({ page }) => {
    await page.goto('/@hiveio/posts', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('post-list-item')).toHaveCount(20);

    expect(await readRenderedCardSummaries(page)).toEqual(getExpectedCardSummaries('/@hiveio/posts'));
  });

  test('CARD-SUM-04 — the /@hiveio/posts HTML carries no post body', async ({ request }) => {
    const response = await request.get('/@hiveio/posts');
    expect(response.status()).toBe(200);
    const html = await response.text();

    const snippets = getBodyOnlySnippets('userProfileTabs', '0006-bridge.get_account_posts.json', '/@hiveio/posts');
    expect(snippets.length).toBeGreaterThanOrEqual(15);
    expect(snippets.filter((snippet) => html.includes(snippet))).toEqual([]);
  });
});
