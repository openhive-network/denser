import type { Page, Route } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { openReplyEditor } from '../support/commentingContext';

/**
 * Notifications and mentions of lite accounts, on a node whose `lite.get_info.methods` lists
 * `account_notifications`, `unread_notifications` and `lookup_accounts` (recorded from steem-16, test
 * namespace `lite_social_test`). steem-16 has no notification of a lite account yet: the browser's
 * notification reads of the lite identity are answered in the browser (as `notifications.spec.ts`
 * does for hivemind's), and so is the gateway (`/api/lite-reply`, `/l2`).
 *
 *   LITE-NOTIF-01 – a lite identity's header shows its unread count from `lite.unread_notifications`;
 *                   `/@did:lite:<name>/notifications` lists its rows, a DID source by name with the
 *                   lite badge and a link to its lite profile
 *   LITE-NOTIF-02 – "Mark all as read" relays one signed `set_last_read` to `/l2` with the newest row's
 *                   date; the count is 0 at once and stays 0 once the node shows the marker
 *   LITE-NOTIF-03 – a Hive user on the node: the bell and the page read `lite.*` for the Hive name,
 *                   and a lite account's follow shows among hivemind's rows, in date order
 *   LITE-NOTIF-04 – typing `@ki` in the lite reply editor offers the lite names from
 *                   `lite.lookup_accounts`; choosing one inserts `@did:lite:<name>`
 *   LITE-NOTIF-05 – the posted reply renders `@did:lite:<name>` as a link to the lite profile with the
 *                   badge, and a plain `@name` as before
 *
 * LITE-NOTIF-06 (nothing changes on a node without the methods) is in liteSocial.spec.ts and
 * litePost.spec.ts, whose recordings predate them; liteProfile.spec.ts's LITE-PROFILE-04 has the
 * page's 404 there.
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=steem-16.syncad.com pnpm --filter @hive/blog test:fixture liteNotifications
 * Replay:  pnpm --filter @hive/blog test:fixture liteNotifications
 */

test.use({ fixtureTestName: 'liteNotifications' });

const API_NODE_PORT = '8200';
// A lite account steem-16 knows, with no notifications at record time.
const GUEST_NAME = 'crisp-koala-499';
const GUEST_DID = `did:lite:${GUEST_NAME}`;
// Lite accounts steem-16 knows whose names start with `ki`.
const MENTIONED_NAME = 'kind-ferret-380';
const MENTIONED_DID = `did:lite:${MENTIONED_NAME}`;
const OTHER_KI_NAME = 'kind-badger-298';
const HIVE_USER = 'test-gateway-1';
const POST_URL = '/lite-test/@test-gateway-1/re-lite-test-478380rd5v/';
const SOCIAL_APP = 'lite_social_test';
const CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';
const TRX_ID = '0'.repeat(40);
const LAST_READ = '2026-10-19 22:56:51';
const NEWEST_DATE = '2026-10-25T10:00:00';
const REPLY_TEXT = 'LITE-NOTIF-05 reply to';

type Notification = { id: string; msg: string; url: string; date: string; type: string; score: number };

const LITE_FOLLOW: Notification = {
  id: '89900000000000047',
  msg: `@${MENTIONED_DID} followed you`,
  url: `@${MENTIONED_DID}`,
  date: NEWEST_DATE,
  type: 'follow',
  score: 15
};
const HIVE_REPLY: Notification = {
  id: '89800000000000044',
  msg: '@test-gateway-2 replied to your post',
  url: '@test-gateway-2/re-lite-smoke-1016-reply',
  date: '2026-10-24T09:00:00',
  type: 'reply',
  score: 25
};

const INFO = {
  enabled: true,
  gate_account: 'test-gateway-4',
  chain_id: CHAIN_ID,
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
  limits: { l2: { apps: { [SOCIAL_APP]: ['follow', 'unfollow', 'mute', 'unmute', 'set_last_read'] }, max_operations: 10 } }
};
const HEALTH = {
  status: 'ok',
  hived: { ok: true, head_block_age_s: 1, stale: false },
  pools: { default: { reply: { ready: true, available_in_s: 0 } } }
};

type L2Tx = { app: string; operations: { method: string; args: Record<string, unknown> }[]; signatures: string[] };

// A throwaway device key pair (never registered on any chain), as liteSocial.spec.ts holds.
const TEST_KEYS = {
  ownerPublicKey: 'STM67vr8aQPGrnXbeKNcMFSbLJBXWpTNbKJGhDEL7xRA1tRsKBtvV',
  postingPublicKey: 'STM7SzVBFaUpKFCgTruZig4UVdRGzurFLvnudxkQbhX1eFtoTEoDc',
  ownerWif: '5JLtFMh9HV23QQCcGK5UY36fjtpFee4ni12SZoJFqJkAzjxGrcC',
  postingWif: '5JR7y1bXahACE9yH7aPrhsThGMtsgDofUBBVeLfbTs78osYAUwd',
  createdAt: '2026-10-21T12:00:00.000Z'
};

/** Stores the registered lite identity `GUEST_NAME` before the page loads. */
async function holdLiteIdentity(page: Page) {
  const identity = { ...TEST_KEYS, name: GUEST_NAME, registered: true };
  await page.addInitScript((value) => {
    window.localStorage.setItem('lite-identity', JSON.stringify({ value, expiresAt: null, createdAt: Date.now() }));
  }, identity);
}

/** Answers the relay's /info and /health, a reply as posted, and `/l2` as accepted; returns the relayed L2 transactions. */
async function mockGateway(page: Page) {
  const sent: L2Tx[] = [];
  await page.route('**/api/lite-reply/health', (route) => route.fulfill({ json: HEALTH }));
  await page.route('**/api/lite-reply', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: INFO });
    const body = route.request().postDataJSON() as { attest_tx: { operations: { args: { permlink: string } }[] } };
    return route.fulfill({
      json: { ok: true, trx_id: TRX_ID, l1_author: 'test-gateway-2', permlink: body.attest_tx.operations[0].args.permlink }
    });
  });
  await page.route('**/api/lite-gateway/l2', (route) => {
    sent.push((route.request().postDataJSON() as { tx: L2Tx }).tx);
    return route.fulfill({ status: 202, json: { trx_id: TRX_ID, gate: 'test-gateway-4', app: SOCIAL_APP } });
  });
  return sent;
}

type RpcCall = { method?: string; params?: { account?: string }; id?: unknown };
type RpcAnswer = (call: RpcCall, route: Route) => Promise<unknown> | unknown;

/**
 * Answers the browser's JSON-RPC calls to the API node whose method is a key of `answers` and
 * whose `account` is `account` (an answer of undefined passes the call on); anything else reaches
 * the fixture proxy.
 */
async function answerNotificationReads(page: Page, account: string, answers: Record<string, RpcAnswer>) {
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === API_NODE_PORT,
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.fallback();
      const call: RpcCall | null = request.postDataJSON();
      const answer = call?.method ? answers[call.method] : undefined;
      if (!call || !answer || call.params?.account !== account) return route.fallback();
      const result = await answer(call, route);
      if (result === undefined) return route.fallback();
      return route.fulfill({ json: { jsonrpc: '2.0', id: call.id ?? 1, result } });
    }
  );
}

const notificationRows = (page: Page) => page.getByTestId('notifications-content-all').getByTestId('notification-list-item');

test.describe('Lite notifications and mentions (fixture-based, node with lite notifications)', () => {
  test('LITE-NOTIF-01: a lite identity sees its unread count and its notifications, DID sources badged', async ({ page }) => {
    await holdLiteIdentity(page);
    await mockGateway(page);
    await answerNotificationReads(page, GUEST_DID, {
      'lite.unread_notifications': () => ({ lastread: LAST_READ, unread: 2 }),
      'lite.account_notifications': () => [LITE_FOLLOW, HIVE_REPLY]
    });
    await page.goto(`/@${GUEST_DID}/notifications`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('lite-identity-unread')).toHaveText('2');
    await expect(notificationRows(page)).toHaveCount(2);
    const liteRow = notificationRows(page).first();
    await expect(liteRow.getByTestId('subscriber-name')).toHaveText(`@${MENTIONED_NAME}`);
    await expect(liteRow.getByTestId('lite-author-badge')).toBeVisible();
    await expect(liteRow.getByTestId('notification-account-icon-link')).toHaveAttribute('href', `/@${MENTIONED_DID}`);
    const hiveRow = notificationRows(page).nth(1);
    await expect(hiveRow.getByTestId('subscriber-name')).toHaveText('@test-gateway-2');
    await expect(hiveRow.getByTestId('lite-author-badge')).toHaveCount(0);

    await page.getByTestId('lite-identity-button').click();
    const menuItem = page.getByTestId('lite-identity-notifications');
    await expect(menuItem).toContainText('(2)');
    await expect(menuItem).toHaveAttribute('href', `/@${GUEST_DID}/notifications`);
  });

  test('LITE-NOTIF-02: Mark all as read relays set_last_read through /l2 and the count drops to 0', async ({ page }) => {
    await holdLiteIdentity(page);
    const sent = await mockGateway(page);
    // The node shows the marker once the op was relayed.
    await answerNotificationReads(page, GUEST_DID, {
      'lite.unread_notifications': () =>
        sent.length > 0 ? { lastread: NEWEST_DATE.replace('T', ' '), unread: 0 } : { lastread: LAST_READ, unread: 2 },
      'lite.account_notifications': () => [LITE_FOLLOW, HIVE_REPLY]
    });
    await page.goto(`/@${GUEST_DID}/notifications`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('lite-identity-unread')).toHaveText('2');
    await page.getByTestId('notifications-mark-all-read').click();

    await expect(page.getByTestId('lite-identity-unread')).toHaveCount(0);
    await expect(page.getByTestId('notifications-mark-all-read')).toHaveCount(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      app: SOCIAL_APP,
      operations: [{ method: 'set_last_read', args: { actor: GUEST_DID, date: NEWEST_DATE } }]
    });
    expect(sent[0].signatures).toHaveLength(1);

    // The validated refetch (4 s after the 202) reads the node's marker: the count stays 0.
    const refetched = page.waitForRequest(
      (request) => request.postData()?.includes('"lite.unread_notifications"') ?? false,
      { timeout: 15_000 }
    );
    await refetched;
    await expect(page.getByTestId('lite-identity-unread')).toHaveCount(0);
  });

  test.describe('signed in with a Hive account', () => {
    test.use({ authenticatedUser: { username: HIVE_USER } });

    test("LITE-NOTIF-03: a Hive user sees a lite account's follow among hivemind's rows, in date order", async ({ page }) => {
      // The node's answer once a lite account followed the Hive user: the follow is the newest row.
      await answerNotificationReads(page, HIVE_USER, {
        'lite.account_notifications': async (_call, route) => {
          const recorded: { result: Notification[] } = await (await route.fetch()).json();
          return [LITE_FOLLOW, ...recorded.result];
        }
      });
      await page.goto(`/@${HIVE_USER}/notifications`, { waitUntil: 'domcontentloaded' });

      // hivemind's rows, read through lite.account_notifications (recorded), then the browser's refetch.
      await expect(notificationRows(page)).toHaveCount(5);
      const names = await notificationRows(page).getByTestId('subscriber-name').allTextContents();
      expect(names).toEqual([`@${MENTIONED_NAME}`, '@test-gateway-5', '@test-gateway-4', '@test-gateway-2', '@swarmpost']);
      await expect(notificationRows(page).first().getByTestId('lite-author-badge')).toBeVisible();
      await expect(notificationRows(page).first().getByTestId('notification-account-icon-link')).toHaveAttribute(
        'href',
        `/@${MENTIONED_DID}`
      );
    });
  });

  test('LITE-NOTIF-04/05: @ki offers lite names, inserts the DID, and the reply renders it with the badge', async ({ page }) => {
    await holdLiteIdentity(page);
    await mockGateway(page);
    await page.goto(POST_URL, { waitUntil: 'domcontentloaded' });

    const reply = page.getByTestId('comment-reply').first();
    await expect(reply).not.toHaveAttribute('aria-haspopup', 'dialog');
    const editor = page.getByTestId('lite-reply-editor');
    await openReplyEditor(reply, editor);
    // Typed at once: only the `@ki` below is typed key by key, so only `ki` is looked up.
    await editor.locator('.cm-content').fill(`${REPLY_TEXT} @test-gateway-2, thanks `);
    await page.keyboard.press('End');
    await page.keyboard.type('@ki');

    const options = page.locator('.cm-tooltip-autocomplete li');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText(OTHER_KI_NAME);
    await options.filter({ hasText: MENTIONED_NAME }).click();
    await expect(editor.locator('.cm-content')).toHaveText(`${REPLY_TEXT} @test-gateway-2, thanks @${MENTIONED_DID}`);

    await page.getByTestId('lite-reply-post').click();

    const body = page.locator('#articleBody', { hasText: REPLY_TEXT });
    const rendered = body.locator(`a[href="/@${MENTIONED_DID}"]`);
    await expect(rendered).toHaveText(`@${MENTIONED_NAME}`);
    await expect(rendered).toBeVisible();
    await expect(rendered).toHaveAttribute('title', MENTIONED_DID);
    const badge = await rendered.evaluate((link) => getComputedStyle(link, '::after').content);
    expect(badge).toBe('"lite account"');
    const plain = body.locator('a[href="/@test-gateway-2"]');
    await expect(plain).toHaveText('@test-gateway-2');
    expect(await plain.evaluate((link) => getComputedStyle(link, '::after').content)).toBe('none');
  });
});
