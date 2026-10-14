import { test, expect } from '../support/fixture-proxy-test';
import { gotoLoggedIn } from '../support/postDisplayContext';
import { PostPage } from '../support/pages/postPage';
import { CHUNK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';
import {
  collectHydrationErrors,
  collectScriptsContaining,
  expectHighlighted,
  expectThemeSwitchRecolours,
  highlightedBlocks,
  inlineCode,
  plainBlocks
} from '../support/syntaxHighlightContext';

/**
 * Fenced code blocks tagged with a language are syntax-highlighted (Shiki) by the server render of
 * a post: on a hard load and after client navigation, which also takes its HTML from the server.
 * The client reuses that HTML, so it neither loads Shiki nor hydrates a different body, and the
 * colours follow the theme through CSS alone.
 *
 * Fixtures: reuses `communityModeratePostFeed` (logged in as guest4test): gtg's HF28 starter kit,
 * whose 16 fenced blocks are all tagged `bash` or `ini`, plus inline code, and the community feed
 * that lists it.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- syntaxHighlightPost
 */

const COMMUNITY = 'hive-160391';
const POST_PATH = `/${COMMUNITY}/@gtg/hive-hardfork-28-jump-starter-kit`;
const TAGGED_BLOCKS = 16;

test.use({ fixtureTestName: 'communityModeratePostFeed', authenticatedUser: {} });

test.describe('Syntax highlighting of a post body', () => {
  test('HL-01 — a hard load serves highlighted blocks the client hydrates unchanged', async ({ page }) => {
    const serverHtml = await (await page.request.get(POST_PATH)).text();
    expect(serverHtml.match(/<pre class=\\?"shiki /g) ?? []).toHaveLength(TAGGED_BLOCKS);

    const hydrationErrors = collectHydrationErrors(page);
    const shikiScripts = collectScriptsContaining(page, CHUNK_MARKERS.shiki);
    await gotoLoggedIn(page, POST_PATH);
    const body = new PostPage(page).articleBody;

    await expect(highlightedBlocks(body)).toHaveCount(TAGGED_BLOCKS);
    await expectHighlighted(highlightedBlocks(body).first());
    await expect(plainBlocks(body)).toHaveCount(0);
    await expect(inlineCode(body).first()).toBeVisible();
    await expect(inlineCode(body).locator('span')).toHaveCount(0);
    await expectThemeSwitchRecolours(highlightedBlocks(body).first());
    expect(hydrationErrors).toEqual([]);
    await page.waitForLoadState('networkidle');
    expect(await shikiScripts()).toEqual([]);
  });

  test('HL-02 — client navigation to the post shows its blocks highlighted', async ({ page }) => {
    await gotoLoggedIn(page, `/trending/${COMMUNITY}`);
    await page.evaluate(() => {
      (window as Window & { hlSameDocument?: boolean }).hlSameDocument = true;
    });

    await page.locator(`a[href="${POST_PATH}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${POST_PATH}$`));
    const body = new PostPage(page).articleBody;

    await expect(highlightedBlocks(body)).toHaveCount(TAGGED_BLOCKS);
    await expectHighlighted(highlightedBlocks(body).first());
    expect(await page.evaluate(() => (window as Window & { hlSameDocument?: boolean }).hlSameDocument)).toBe(true);
  });

  test('PERF-CHUNKS-06 — no chunk referenced from a post with highlighted code contains Shiki', async ({ page }) => {
    expect(await findMarkersInInitialChunks(page.request, POST_PATH, [CHUNK_MARKERS.shiki])).toEqual([]);
  });
});
