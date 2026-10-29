import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * A lite account's profile on a lite-aware API node that serves `lite.get_profile` (recorded from
 * steem-16): `lite.get_profile` and `lite.get_account_posts` with `account = did:lite:<name>`.
 *
 *   LITE-PROFILE-01 – /@did:lite:<name> opens on its Posts: the card (name, badge, "Lite account",
 *                     joined date, post count) and only the Posts / Comments / Replies tabs
 *   LITE-PROFILE-02 – the Comments and Replies tabs list the account's DID-authored entries
 *   LITE-PROFILE-03 – on the post page, the lite author's card links to the profile, which opens
 *   LITE-PROFILE-04 – the profile pages a lite account does not have answer not-found
 *   LITE-SOCIAL-08  – this node advertises no `apps.social`: a guest holding a registered lite
 *                     account, on a deployment whose gateway relays L2 social ops, gets no lite
 *                     Follow / Mute, no Blog or social tabs and no "My feed"
 *   LITE-PROFILE-05 – a gate account's (Hive) profile shows the lite-account gateway note
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=steem-16.syncad.com pnpm --filter @hive/blog test:fixture liteProfile
 * Replay:  pnpm --filter @hive/blog test:fixture liteProfile
 */

test.use({ fixtureTestName: 'liteProfile' });

const LITE_NAME = 'lite-smoke-1016';
const LITE_DID = `did:lite:${LITE_NAME}`;
const REPLY_LITE_NAME = 'warm-zebra-201';
const GATE = 'test-gateway-1';
const POST_URL = `/lite-test/@${GATE}/re-lite-test-478380rd5v/`;
const TITLE = 'lite gateway smoke test';
const POST_COUNT = '4';
const NOT_FOUND_TITLE = 'Page not found - Hive Blog';

test.describe('Lite account profile (fixture-based, lite-aware node)', () => {
  test('LITE-PROFILE-01: the profile opens on its posts, with the lite card and three tabs', async ({ page }) => {
    await page.goto(`/@${LITE_DID}`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}/posts$`));
    const card = page.getByTestId('lite-profile-card');
    await expect(card.getByTestId('profile-name')).toHaveText(LITE_NAME);
    await expect(card.getByTestId('lite-author-badge')).toBeVisible();
    await expect(card.getByTestId('lite-profile-kind')).toHaveText('Lite account');
    await expect(card.getByTestId('user-joined')).toHaveText('Joined October 2026');
    await expect(card.getByTestId('lite-profile-post-count')).toHaveText(POST_COUNT);
    await expect(card.getByTestId('user-avatar')).toHaveAttribute('src', /\/defaultavatar\.png$/);
    await expect(page.getByTestId('profile-follow-button')).toHaveCount(0);

    const tabs = page.getByTestId('profile-navigation').getByRole('link');
    await expect(tabs).toHaveText(['Posts', 'Comments', 'Replies']);
    await expect(tabs.first()).toHaveAttribute('href', new RegExp(`/@${LITE_DID}/posts$`));

    const posts = page.getByTestId('post-list-item');
    await expect(posts).toHaveCount(1);
    await expect(posts.getByTestId('post-title')).toContainText(TITLE);
    await expect(posts.getByTestId('post-author')).toHaveText(LITE_NAME);
    await expect(posts.getByTestId('post-author')).toHaveAttribute('href', new RegExp(`/@${LITE_DID}$`));
    await expect(posts.getByTestId('lite-author-badge')).toBeVisible();
  });

  test('LITE-PROFILE-02: the Comments and Replies tabs list its DID-authored entries', async ({ page }) => {
    await page.goto(`/@${LITE_DID}/posts`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('post-list-item')).toHaveCount(1);
    const tabs = page.getByTestId('profile-navigation');

    await tabs.getByRole('link', { name: 'Comments' }).click();
    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}/comments$`));
    const comments = page.getByTestId('post-list-item');
    await expect(comments).toHaveCount(3);
    await expect(comments.getByTestId('post-author')).toHaveText([LITE_NAME, LITE_NAME, LITE_NAME]);

    await tabs.getByRole('link', { name: 'Replies' }).click();
    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}/replies$`));
    const replies = page.getByTestId('post-list-item');
    await expect(replies).toHaveCount(4);
    await expect(replies.getByTestId('post-author').filter({ hasText: REPLY_LITE_NAME })).toHaveCount(1);
    await expect(replies.getByTestId('post-author').filter({ hasText: 'did:lite:' })).toHaveCount(0);

    // Served from the server render as well.
    const response = await page.goto(`/@${LITE_DID}/replies`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('post-list-item')).toHaveCount(4);
  });

  test('LITE-PROFILE-03: the post author card links to the lite profile', async ({ page }) => {
    const postPage = new PostPage(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await postPage.articleAuthorName.click();
    const name = postPage.userPopoverCard.getByTestId('lite-account-card-name');
    await expect(name).toHaveText(LITE_NAME);
    await expect(name).toHaveAttribute('href', new RegExp(`/@${LITE_DID}$`));

    await name.click();
    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}/posts$`));
    await expect(page.getByTestId('lite-profile-card').getByTestId('profile-name')).toHaveText(LITE_NAME);
  });

  test('LITE-PROFILE-04: the profile pages a lite account does not have are not found', async ({ page }) => {
    for (const path of ['followers', 'followed', 'feed', 'payout', 'communities', 'notifications']) {
      const response = await page.goto(`/@${LITE_DID}/${path}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), path).toBe(404);
      await expect(page, path).toHaveTitle(NOT_FOUND_TITLE);
      await expect(page.getByTestId('not-found-page'), path).toBeVisible();
      await expect(page.getByTestId('lite-profile-card'), path).toHaveCount(0);
    }
    const unknown = await page.goto('/@did:lite:no-such-lite-1', { waitUntil: 'domcontentloaded' });
    expect(unknown?.status()).toBe(404);
    await expect(page).toHaveTitle(NOT_FOUND_TITLE);
  });

  test('LITE-SOCIAL-08: no lite social UI on a node without the social app', async ({ page }) => {
    const identity = { name: REPLY_LITE_NAME, registered: true, ownerPublicKey: '', postingPublicKey: '', ownerWif: '', postingWif: '', createdAt: '' };
    await page.addInitScript((value) => {
      window.localStorage.setItem('lite-identity', JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
    }, identity);
    const l2 = { apps: { lite_social_test: ['follow', 'unfollow', 'mute', 'unmute', 'set_profile'] } };
    await page.route('**/api/lite-reply', (route) =>
      route.fulfill({
        json: {
          enabled: true,
          gate_account: GATE,
          chain_id: 'beeab0de00000000000000000000000000000000000000000000000000000000',
          apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
          limits: { l2 }
        }
      })
    );

    await page.goto(`/@${GATE}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lite-identity-button')).toBeVisible();
    // The Hive author's Follow stays the sign-in one, with no Mute beside it.
    await expect(page.getByTestId('profile-follow-button').first()).toBeVisible();
    await expect(page.getByTestId('profile-mute-button')).toHaveCount(0);
    await page.getByTestId('lite-identity-button').click();
    await expect(page.getByTestId('lite-identity-profile')).toBeVisible();
    await expect(page.getByTestId('lite-identity-feed')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto(`/@${LITE_DID}/posts`, { waitUntil: 'domcontentloaded' });
    const nav = page.getByTestId('profile-navigation');
    await expect(nav.getByRole('link')).toHaveText(['Posts', 'Comments', 'Replies']);
    await expect(page.getByTestId('lite-profile-card').getByTestId('profile-follow-button')).toHaveCount(0);
    await expect(page.getByTestId('lite-profile-followers')).toHaveCount(0);
  });

  test('LITE-PROFILE-05: a gate account profile shows the lite-account gateway note', async ({ page }) => {
    await page.goto(`/@${GATE}`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('profile-name')).toHaveText(GATE);
    await expect(page.getByTestId('lite-gateway-note')).toHaveText('Lite-account gateway');
  });
});
