import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';

/**
 * Lite social for guests, on a node whose `lite.get_info` advertises `apps.social` (recorded from
 * steem-16, test namespace `lite_social_test`). The gateway's `/l2` is answered in the browser.
 *
 *   LITE-SOCIAL-01 – a guest acting as its lite account follows a Hive author: the button and the
 *                    follower count change at once, and one signed `follow` op goes to /l2
 *   LITE-SOCIAL-05 – the lite account's owner edits its profile (`set_profile`); the card shows it
 *   LITE-SOCIAL-06 – the lite profile has the Blog, Followers, Following and Muted tabs and counts;
 *                    its Following list names the Hive account it follows
 *   LITE-SOCIAL-07 – a Hive profile's followers include a lite follower, with the lite badge
 *   LITE-SOCIAL-09 – `rate_limited` keeps the follow state, toasts and shows the wait
 *
 * LITE-SOCIAL-08 (no social UI on a node without `apps.social`) is in liteProfile.spec.ts, whose
 * recording has none.
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=steem-16.syncad.com pnpm --filter @hive/blog test:fixture liteSocial
 * Replay:  pnpm --filter @hive/blog test:fixture liteSocial
 */

test.use({ fixtureTestName: 'liteSocial' });

const HIVE_AUTHOR = 'test-gateway-1';
const LITE_NAME = 'lite-smoke-1016';
const LITE_DID = `did:lite:${LITE_NAME}`;
// A lite account steem-16 knows (the node refuses reads of an unknown DID), following nobody at record time.
const GUEST_NAME = 'crisp-koala-499';
const SOCIAL_APP = 'lite_social_test';
const CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';

const INFO = {
  enabled: true,
  gate_account: 'test-gateway-4',
  chain_id: CHAIN_ID,
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
  limits: {
    l2: {
      apps: { [SOCIAL_APP]: ['follow', 'unfollow', 'mute', 'unmute', 'reblog', 'unreblog', 'subscribe', 'unsubscribe', 'set_profile'] },
      rate: { max: 30, window_s: 600 },
      max_tx_bytes: 16384,
      max_operations: 10
    }
  }
};

type L2Tx = { app: string; version: number; operations: { method: string; args: Record<string, unknown> }[]; signatures: string[] };

// A throwaway device key pair (never registered on any chain): the gateway is mocked, and the
// node only reads the DID. @hiveio/lite-account is ESM-only, which Playwright's loader cannot import.
const TEST_KEYS = {
  ownerPublicKey: 'STM67vr8aQPGrnXbeKNcMFSbLJBXWpTNbKJGhDEL7xRA1tRsKBtvV',
  postingPublicKey: 'STM7SzVBFaUpKFCgTruZig4UVdRGzurFLvnudxkQbhX1eFtoTEoDc',
  ownerWif: '5JLtFMh9HV23QQCcGK5UY36fjtpFee4ni12SZoJFqJkAzjxGrcC',
  postingWif: '5JR7y1bXahACE9yH7aPrhsThGMtsgDofUBBVeLfbTs78osYAUwd',
  createdAt: '2026-10-21T12:00:00.000Z'
};

/** Stores a registered lite identity named `name` before the page loads, as the name dialog and a first post leave it. */
async function holdLiteIdentity(page: Page, name: string) {
  const identity = { ...TEST_KEYS, name, registered: true };
  await page.addInitScript((value) => {
    window.localStorage.setItem('lite-identity', JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
  }, identity);
}

/** Answers the relay's /info and the gateway's /l2 (with `answer`) in the browser; returns the relayed transactions. */
async function mockGateway(page: Page, answer: { status: number; json: Record<string, unknown> }) {
  const sent: L2Tx[] = [];
  await page.route('**/api/lite-reply', (route) => route.fulfill({ json: INFO }));
  await page.route('**/api/lite-gateway/l2', (route) => {
    sent.push((route.request().postDataJSON() as { tx: L2Tx }).tx);
    return route.fulfill(answer);
  });
  return sent;
}

const ACCEPTED = { status: 202, json: { trx_id: '0'.repeat(40), gate: 'test-gateway-4', app: SOCIAL_APP } };

/** The follower count of the Hive profile's stats grid. */
const followerCount = (page: Page) => page.getByTestId('profile-stats').getByRole('link').first().locator('span').first();

test.describe('Lite social for guests (fixture-based, node with lite_social)', () => {
  test('LITE-SOCIAL-01: a guest follows a Hive author as its lite account', async ({ page }) => {
    await holdLiteIdentity(page, GUEST_NAME);
    const sent = await mockGateway(page, ACCEPTED);
    await page.goto(`/@${HIVE_AUTHOR}`, { waitUntil: 'domcontentloaded' });

    const follow = page.getByTestId('profile-follow-button').first();
    // The server renders the sign-in Follow; Mute appears once the lite buttons replaced it.
    await expect(page.getByTestId('profile-mute-button').first()).toBeVisible();
    await expect(follow).toHaveText('Follow');
    const before = Number(await followerCount(page).textContent());

    await follow.click();

    await expect(follow).toHaveText('Unfollow');
    await expect(followerCount(page)).toHaveText(String(before + 1));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      app: SOCIAL_APP,
      version: 1,
      operations: [{ method: 'follow', args: { actor: `did:lite:${GUEST_NAME}`, target: `did:hive:${HIVE_AUTHOR}` } }]
    });
    expect(sent[0].signatures).toHaveLength(1);
  });

  test('LITE-SOCIAL-09: rate_limited keeps the follow state and shows the wait', async ({ page }) => {
    await holdLiteIdentity(page, GUEST_NAME);
    await mockGateway(page, { status: 429, json: { ok: false, code: 'rate_limited', message: 'slow down', retry_after_s: 30 } });
    await page.goto(`/@${HIVE_AUTHOR}`, { waitUntil: 'domcontentloaded' });

    const follow = page.getByTestId('profile-follow-button').first();
    await expect(page.getByTestId('profile-mute-button').first()).toBeVisible();
    await expect(follow).toHaveText('Follow');
    await follow.click();

    await expect(page.getByTestId('lite-social-retry')).toContainText(/Wait \d+ s/);
    await expect(page.getByText('Too many actions for now. Try again in 30 s.', { exact: true })).toBeVisible();
    await expect(follow).toHaveText('Follow');
    await expect(follow).toBeDisabled();
  });

  test('LITE-SOCIAL-06: the lite profile has the social tabs, its counts and its follows', async ({ page }) => {
    await page.goto(`/@${LITE_DID}`, { waitUntil: 'domcontentloaded' });

    // On a node with the social app the profile opens on its blog.
    await expect(page).toHaveURL(new RegExp(`/@${LITE_DID}$`));
    const nav = page.getByTestId('profile-navigation');
    for (const tab of ['Blog', 'Posts', 'Comments', 'Replies', 'Followers', 'Following', 'Muted Users']) {
      await expect(nav.getByRole('link', { name: tab, exact: true })).toBeVisible();
    }
    // The Feed tab is the owner's only.
    await expect(nav.getByRole('link', { name: 'Feed', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('lite-profile-following')).toHaveText('1');

    await nav.getByRole('link', { name: 'Following', exact: true }).click();
    const list = page.getByTestId('lite-follow-list-following');
    await expect(list.getByTestId('account-name-link')).toHaveText([HIVE_AUTHOR]);
    await expect(list.getByTestId('account-name-link')).toHaveAttribute('href', new RegExp(`/@${HIVE_AUTHOR}$`));
  });

  test('LITE-SOCIAL-07: a Hive profile lists its lite followers with the lite badge', async ({ page }) => {
    await page.goto(`/@${HIVE_AUTHOR}/followers`, { waitUntil: 'domcontentloaded' });

    const lite = page.getByTestId('account-name-link').filter({ hasText: LITE_NAME });
    await expect(lite).toHaveAttribute('href', new RegExp(`/@${LITE_DID}$`));
    await expect(page.locator('li').filter({ has: lite }).getByTestId('lite-author-badge')).toBeVisible();
  });

  test('LITE-SOCIAL-05: the owner edits the lite profile and the card shows it', async ({ page }) => {
    await holdLiteIdentity(page, LITE_NAME);
    const sent = await mockGateway(page, ACCEPTED);
    await page.goto(`/@${LITE_DID}`, { waitUntil: 'domcontentloaded' });

    // The owner gets its feed and Edit profile, not Follow.
    await expect(page.getByTestId('profile-navigation').getByRole('link', { name: 'Feed', exact: true })).toBeVisible();
    await expect(page.getByTestId('lite-profile-card').getByTestId('profile-follow-button')).toHaveCount(0);
    await page.getByTestId('lite-profile-edit').click();
    const about = 'Edited through the lite gateway';
    await page.getByTestId('lite-profile-field-about').fill(about);
    await page.getByTestId('lite-profile-field-location').fill('Tbilisi');
    await page.getByTestId('lite-profile-save').click();

    await expect(page.getByTestId('lite-profile-edit-dialog')).toHaveCount(0);
    await expect(page.getByTestId('lite-profile-about')).toHaveText(about);
    await expect(page.getByTestId('lite-profile-location')).toHaveText('Tbilisi');
    expect(sent).toHaveLength(1);
    expect(sent[0].operations[0]).toMatchObject({
      method: 'set_profile',
      args: { actor: LITE_DID, profile: { about, location: 'Tbilisi' } }
    });
  });
});
