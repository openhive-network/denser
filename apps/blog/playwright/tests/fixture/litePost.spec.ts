import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * A lite account's post on a lite-aware API node (recorded from steem-16, which serves
 * `lite.*`): the node answers `lite.get_info`, so post reads go through `lite.*` and name lite
 * authors as `did:lite:<name>`.
 *
 *   LITE-POST-01 – the post's author renders by lite name with the badge
 *   LITE-POST-02 – DID reply authors render the same way; their links keep the DID
 *   LITE-POST-03 – the author popover is the lite account card, linking the lite profile, without follow/mute
 *   LITE-POST-04 – the post's DID URL renders the same post
 *   LITE-POST-05 – the browser takes the server's lite.get_info answer: loading and navigating
 *                  client-side to a lite post ask the node no lite.get_info from the browser
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=steem-16.syncad.com pnpm --filter @hive/blog test:fixture litePost
 * Replay:  pnpm --filter @hive/blog test:fixture litePost
 */

test.use({ fixtureTestName: 'litePost' });

const CATEGORY = 'lite-test';
const GATE = 'test-gateway-1';
const PERMLINK = 're-lite-test-478380rd5v';
const LITE_NAME = 'lite-smoke-1016';
const LITE_DID = `did:lite:${LITE_NAME}`;
const REPLY_LITE_NAME = 'warm-zebra-201';
const TITLE = 'lite gateway smoke test';
const API_NODE = 'http://localhost:8200';

/** The JSON-RPC methods the browser itself (not the server render) sends the API node. */
const recordBrowserApiMethods = (page: Page) => {
  const methods: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(API_NODE)) return;
    const body: unknown = request.postDataJSON();
    const calls = Array.isArray(body) ? body : [body];
    for (const call of calls) {
      if (typeof call === 'object' && call !== null && 'method' in call && typeof call.method === 'string') {
        methods.push(call.method);
      }
    }
  });
  return methods;
};

test.describe('Lite account post (fixture-based, lite-aware node)', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('LITE-POST-01: the author renders by lite name with the badge', async ({ page }) => {
    await page.goto(`/${CATEGORY}/@${GATE}/${PERMLINK}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.articleTitle).toHaveText(TITLE);
    await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
    await expect(postPage.articleAuthorData.getByTestId('lite-author-badge')).toBeVisible();
    await expect(postPage.articleAuthorData.getByTestId('author-reputation')).toHaveText('(25)');
    await expect(postPage.articleAuthorData.getByTestId('user-avatar')).toHaveAttribute('src', /\/defaultavatar\.png$/);
    await expect(page.locator(`a[href$="/@${LITE_NAME}"]`)).toHaveCount(0);
  });

  test('LITE-POST-02: DID reply authors render by lite name and their links keep the DID', async ({ page }) => {
    await page.goto(`/${CATEGORY}/@${GATE}/${PERMLINK}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.commentListItems.first()).toBeVisible();
    await expect(postPage.commentAuthorLink.filter({ hasText: REPLY_LITE_NAME })).toHaveCount(1);
    await expect(postPage.commentAuthorLink.filter({ hasText: 'did:lite:' })).toHaveCount(0);
    await expect(postPage.commentCardsHeaders.first().getByTestId('lite-author-badge')).toBeVisible();
    await expect(page.locator(`a[href*="/@did:lite:${REPLY_LITE_NAME}/"]`).first()).toBeAttached();
  });

  test('LITE-POST-03: the author popover is the lite account card, without follow or mute', async ({ page }) => {
    await page.goto(`/${CATEGORY}/@${GATE}/${PERMLINK}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await postPage.articleAuthorName.click();

    await expect(postPage.userPopoverCard.getByTestId('lite-account-card-name')).toHaveText(LITE_NAME);
    await expect(postPage.userPopoverCard.getByTestId('lite-account-card-name')).toHaveAttribute('href', new RegExp(`/@${LITE_DID}$`));
    await expect(postPage.userPopoverCard.getByTestId('lite-author-badge')).toBeVisible();
    await expect(postPage.userPopoverCardFollowButton).toHaveCount(0);
    await expect(postPage.userPopoverCard.locator('button', { hasText: 'Mute' })).toHaveCount(0);
  });

  test('LITE-POST-04: the DID URL of the post renders the same post', async ({ page }) => {
    const response = await page.goto(`/${CATEGORY}/@${LITE_DID}/${PERMLINK}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    expect(response?.status()).toBe(200);
    await expect(postPage.articleTitle).toHaveText(TITLE);
    await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
  });

  // The fixture's server render and the browser read from the same node (REACT_APP_API_ENDPOINT,
  // the fixture proxy, with no node picked), so the browser is seeded with the server's answer and
  // asks for none itself, neither on load nor on its first client-side post read.
  test('LITE-POST-05: the browser asks no lite.get_info on load nor on a client-side navigation', async ({ page }) => {
    const browserMethods = recordBrowserApiMethods(page);
    await page.goto(`/${CATEGORY}/@${GATE}/${PERMLINK}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();
    await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
    await page.waitForLoadState('networkidle');
    expect(browserMethods).not.toContain('lite.get_info');

    await page.evaluate((href) => {
      (window as Window & { next?: { router?: { push: (href: string) => void } } }).next?.router?.push(href);
    }, `/${CATEGORY}/@${LITE_DID}/${PERMLINK}/`);
    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}/${PERMLINK}/?$`));
    await expect(postPage.articleAuthorName).toHaveText(LITE_NAME);
    await expect(postPage.articleAuthorData.getByTestId('lite-author-badge')).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(browserMethods).not.toContain('lite.get_info');
  });
});
