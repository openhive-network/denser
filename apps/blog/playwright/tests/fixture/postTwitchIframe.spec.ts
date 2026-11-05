import type { Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * Twitch iframes in a post body: Twitch plays only on the sites its `parent=` list names, so the
 * body's iframe (here the one dagamers.xyz posts, which names peakd.com, hive.blog, steemit.com
 * and ecency.com) must load with the serving host added. The server leaves its src out of the
 * HTML, so the first load already carries the host.
 *
 * Post data replays from the `postTwitchIframe` recording: a copy of `postEmbedTableLayout`'s
 * calls with the body replaced by a dagamers-style Twitch iframe, a YouTube iframe and a
 * Twitch video link. The players are served a blank page.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postTwitchIframe
 */

test.use({ fixtureTestName: 'postTwitchIframe' });
test.skip(isRecordMode, 'replay-only: the post is built from the postEmbedTableLayout recording');

const POST_PATH = '/test/@guest4test1/test-twitch-iframe/';
const BODY_PARENTS = ['peakd.com', 'hive.blog', 'steemit.com', 'ecency.com'];
const YOUTUBE_SRC = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const PLAYER_ORIGINS = ['https://player.twitch.tv/**', 'https://www.youtube.com/**'];

async function stubPlayers(page: Page): Promise<string[]> {
  for (const origin of PLAYER_ORIGINS) {
    await page.route(origin, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' })
    );
  }
  const twitchRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname === 'player.twitch.tv') twitchRequests.push(request.url());
  });
  return twitchRequests;
}

const parentsOf = (src: string | null) => new URL(src ?? '').searchParams.getAll('parent');

test.describe('Twitch iframe in a post body (fixture-based)', () => {
  test('TWITCH-IFRAME-01: a body Twitch iframe loads with the host added to its parents', async ({ page }) => {
    const twitchRequests = await stubPlayers(page);
    const postPage = new PostPage(page);
    const response = await page.goto(POST_PATH, { waitUntil: 'domcontentloaded' });
    const host = new URL(page.url()).hostname;

    // The server HTML names no Twitch src, so nothing loads with the body's parents only.
    // (The RSC payload's copy of the markdown body escapes its quotes and matches neither.)
    const serverHtml = (await response?.text()) ?? '';
    expect(serverHtml).toMatch(/<iframe data-twitch-src="https:\/\/player\.twitch\.tv\//);
    expect(serverHtml).not.toMatch(/<iframe[^>]*\ssrc="https:\/\/player\.twitch\.tv/);

    await postPage.waitForPostHydration();
    const twitchIframe = page.locator('#articleBody iframe[src*="player.twitch.tv/?video=v2919479459"]');
    await expect(twitchIframe).toHaveCount(1);
    const parents = parentsOf(await twitchIframe.getAttribute('src'));
    expect(parents).toEqual([...BODY_PARENTS, host]);
    await expect(twitchIframe).not.toHaveAttribute('data-twitch-src');

    await twitchIframe.scrollIntoViewIfNeeded();
    await expect.poll(() => twitchRequests.length).toBeGreaterThan(0);
    for (const url of twitchRequests) expect(parentsOf(url)).toContain(host);
  });

  test('TWITCH-IFRAME-02: a body iframe of another provider keeps its src', async ({ page }) => {
    await stubPlayers(page);
    const postPage = new PostPage(page);
    await page.goto(POST_PATH, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(page.locator(`#articleBody iframe[src="${YOUTUBE_SRC}"]`)).toHaveCount(1);
  });

  test('TWITCH-IFRAME-03: a Twitch link plays with the host as parent', async ({ page }) => {
    await stubPlayers(page);
    const postPage = new PostPage(page);
    await page.goto(POST_PATH, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();
    const host = new URL(page.url()).hostname;
    // The body iframe is loaded by the same effect that makes the facades clickable.
    await expect(page.locator('#articleBody iframe[src*="player.twitch.tv/?video=v2919479459"]')).toHaveCount(1);

    const facade = page.locator('#articleBody .twitch-facade');
    await expect(facade).toHaveCount(1);
    await facade.click();
    const player = page.locator('#articleBody iframe[src*="player.twitch.tv"][src*="autoplay=true"]');
    await expect(player).toHaveCount(1);
    expect(parentsOf(await player.getAttribute('src'))).toEqual([host]);
  });
});
