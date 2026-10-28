import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  ACCOUNT_APP,
  chainTimeIn,
  configureSigners,
  holdIdentity,
  keyMember,
  mockPasskeyGateway,
  openLoginDialog,
  recordSignerRequests,
  relayInfo,
  ROOT_KEY,
  securedIdentity,
  SIGNER,
  SIGNER_KEYS,
  storedIdentity,
  stubSigners,
  TEST_KEYS,
  type Authority
} from '../support/litePasskeyContext';

/**
 * Graduating a lite account to a Hive account, and the "Passkey signer" login type, on the
 * `liteSocial` recording (steem-16; its lite profile `lite-smoke-1016`). The gateway's graduation
 * read, `/graduate` and `/l2` are answered in the browser; the signer popup is the stub of the
 * passkey specs (no network in fixture runs).
 *
 *   LITE-GRAD-01 – the upgrade item and the profile with the ledger amount; below the threshold
 *                  disabled with the progress
 *   LITE-GRAD-02 – a full graduation: the signer's four keys and a posting-signed link sent to
 *                  /graduate, the identity marked graduated, the profile and the menu name the account
 *   LITE-GRAD-03 – name_taken, daily_cap, graduation_disabled and creator_balance are named and
 *                  change nothing; a failed link offers Retry link, relayed through /l2
 *   LITE-GRAD-04 – the Passkey signer sign-in: an account whose posting authority lacks the derived
 *                  key is refused with a message; a matching one has the signer sign the login
 *                  challenge with that key, and the session becomes that account (the fixture app
 *                  signs in client-only; the signed-in header's reads of it are accepted misses)
 *   LITE-GRAD-05 – a gateway that does not graduate: none of it shows
 *
 * A vote of the passkey session is not broadcast here: the recording has no post this account can
 * vote on; the signer's `signTransaction` request for the login challenge is what is checked.
 */

const LITE_NAME = 'lite-smoke-1016';
const PROFILE = `/@did:lite:${LITE_NAME}`;
/** A Hive account of the recording (`database_api.find_accounts`) and its posting key. */
const HIVE_ACCOUNT = 'test-gateway-1';
const HIVE_POSTING_KEY = 'STM5QGQyvZHhjSP3Y3qUvEPDJejumn7gSu9XzS8P4RiJY5PXTRxph';

const securedAuthority = (): Authority => ({
  owner: [keyMember(ROOT_KEY, { meta: { kind: 'passkey', signer: SIGNER, label: 'YubiKey 5 Series' } })],
  posting: [
    keyMember(TEST_KEYS.postingPublicKey, {
      expires: chainTimeIn(60),
      meta: { kind: 'device', label: 'Chrome · Linux', signer: SIGNER }
    })
  ]
});

type GraduationView = {
  ok: true;
  name: string;
  eligible: boolean;
  reason: string;
  policy: string;
  rewards_hbd: number;
  threshold_hbd: number | null;
  linked_account: string | null;
};
const eligibleView = (): GraduationView => ({
  ok: true,
  name: LITE_NAME,
  eligible: true,
  reason: 'rewards_reached',
  policy: 'rewards',
  rewards_hbd: 3.5,
  threshold_hbd: 3,
  linked_account: null
});

type GraduateAnswer = { status: number; json: Record<string, unknown> };
type L2Tx = { app: string; operations: { method: string; args: Record<string, unknown> }[]; signatures: string[] };
type GraduateBody = { tx: L2Tx; keys: Record<string, string> };

/**
 * The gateway of a secured `lite-smoke-1016`: `/info` relaying `link` (unless `graduates` is false),
 * its authority, its graduation read from `view`, `/graduate` answering `answers` in turn (then
 * success) and `/l2`; a created account counts as linked once its link was relayed.
 */
async function mockGraduationGateway(page: Page, view: GraduationView, { graduates = true, answers = [] as GraduateAnswer[] } = {}) {
  await mockPasskeyGateway(page, LITE_NAME, securedAuthority());
  const info = relayInfo();
  if (graduates) info.limits.l2.apps[ACCOUNT_APP] = [...(info.limits.l2.apps[ACCOUNT_APP] ?? []), 'link'];
  await page.route('**/api/lite-reply', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: info }) : route.fallback()
  );
  const graduated: GraduateBody[] = [];
  const links: L2Tx[] = [];
  await page.route('**/api/lite-gateway/names/*/graduation', (route) => route.fulfill({ json: view }));
  await page.route('**/api/lite-gateway/names/*/availability', (route) => {
    const name = decodeURIComponent(route.request().url().split('/names/')[1].split('/')[0]);
    const own = name === LITE_NAME;
    return route.fulfill({
      json: { name, available: !own, lite_grammar_ok: true, l1_grammar_ok: true, lite_taken: own, l1_taken: false }
    });
  });
  await page.route('**/api/lite-gateway/graduate', (route) => {
    const body = route.request().postDataJSON() as GraduateBody;
    graduated.push(body);
    const answer = answers.shift();
    if (answer) return route.fulfill({ status: answer.status, json: answer.json });
    const account = String(body.tx.operations[0].args.account);
    view.linked_account = account;
    view.eligible = false;
    return route.fulfill({
      status: 202,
      json: { ok: true, account, create_trx_id: 'a'.repeat(40), link_trx_id: 'b'.repeat(40), path: 'claimed' }
    });
  });
  await page.route('**/api/lite-gateway/l2', (route) => {
    const tx = (route.request().postDataJSON() as { tx: L2Tx }).tx;
    if (tx.operations[0]?.method !== 'link') return route.fallback();
    links.push(tx);
    view.linked_account = String(tx.operations[0].args.account);
    return route.fulfill({ status: 202, json: { ok: true, trx_id: 'c'.repeat(40), gate: 'test-gateway-4', app: tx.app } });
  });
  return { graduated, links };
}

async function openMenu(page: Page) {
  await page.getByTestId('lite-identity-button').click();
  return page.getByTestId('lite-identity-menu');
}

/** Opens the graduation dialog from the menu and waits for the lite name to check as available. */
async function openGraduation(page: Page) {
  const menu = await openMenu(page);
  await menu.getByTestId('lite-identity-upgrade').click();
  const dialog = page.getByTestId('lite-graduation-dialog');
  await expect(dialog.getByTestId('lite-graduation-name')).toHaveValue(LITE_NAME);
  await expect(dialog.getByTestId('lite-graduation-name-state')).toHaveAttribute('data-state', 'available');
  return dialog;
}

const storedBinding = (page: Page, account: string) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { value: unknown }).value : null;
  }, `passkey-signer-${account}`);

test.use({ fixtureTestName: 'liteSocial' });

test.describe('Lite account graduation (fixture-based, mocked gateway and signer)', () => {
  test('LITE-GRAD-01: the upgrade shows the ledger amount; below the threshold it is disabled with the progress', async ({
    page
  }) => {
    await holdIdentity(page, securedIdentity(LITE_NAME, chainTimeIn(60)));
    const view = { ...eligibleView(), eligible: false, reason: 'below_threshold', rewards_hbd: 1.25 };
    await mockGraduationGateway(page, view);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('lite-profile-upgrade-amount')).toHaveText('1.250 of 3.000 HBD earned (41%)');
    await expect(page.getByTestId('lite-profile-upgrade-button')).toBeDisabled();
    let menu = await openMenu(page);
    const item = menu.getByTestId('lite-identity-upgrade');
    await expect(item).toHaveAttribute('data-disabled', '');
    await expect(item.getByTestId('lite-identity-upgrade-amount')).toHaveText('1.250 of 3.000 HBD earned (41%)');
    await page.keyboard.press('Escape');

    Object.assign(view, eligibleView());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('lite-profile-upgrade-button')).toBeEnabled();
    menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-upgrade')).not.toHaveAttribute('data-disabled', '');
    await expect(menu.getByTestId('lite-identity-upgrade-amount')).toHaveText('3.500 HBD earned, 3.000 HBD needed');
  });

  test('LITE-GRAD-02: a full graduation creates the account with the signer\'s keys and marks the identity', async ({
    page,
    context
  }) => {
    await configureSigners(page, [SIGNER]);
    await stubSigners(context);
    const requests = await recordSignerRequests(context);
    await holdIdentity(page, securedIdentity(LITE_NAME, chainTimeIn(60)));
    const gateway = await mockGraduationGateway(page, eligibleView());
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const dialog = await openGraduation(page);
    const popup = page.waitForEvent('popup');
    await dialog.getByTestId('lite-graduation-confirm').click();
    expect((await popup).url()).toBe(`${SIGNER}/sign/`);
    const outcome = dialog.getByTestId('lite-graduation-outcome');
    await expect(outcome).toHaveAttribute('data-phase', 'done', { timeout: 30_000 });
    await expect(dialog.getByTestId('lite-graduation-step-linking')).toHaveAttribute('data-status', 'done');

    expect(requests).toEqual([{ hiveSigner: '1', id: expect.any(String), method: 'getPublicKeys', params: { roles: [0, 1, 4, 3], account: 0 } }]);
    expect(gateway.graduated).toHaveLength(1);
    const { tx, keys } = gateway.graduated[0];
    expect(keys).toEqual({ owner: SIGNER_KEYS[0], active: SIGNER_KEYS[1], posting: SIGNER_KEYS[4], memo: SIGNER_KEYS[3] });
    expect(tx.app).toBe(ACCOUNT_APP);
    expect(tx.operations).toEqual([{ method: 'link', args: { name: LITE_NAME, account: LITE_NAME } }]);
    expect(tx.signatures).toHaveLength(1);
    expect(await storedIdentity(page)).toMatchObject({ name: LITE_NAME, graduated: LITE_NAME, secured: true });
    expect(await storedBinding(page, LITE_NAME)).toEqual({ origin: SIGNER, publicKey: SIGNER_KEYS[4] });
    await expect(dialog.getByTestId('lite-graduation-sign-in')).toHaveText(`Sign in as @${LITE_NAME}`);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('lite-profile-graduated-link')).toHaveAttribute('href', `/@${LITE_NAME}`);
    const menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-graduated')).toContainText(`Now @${LITE_NAME}`);
    await expect(menu.getByTestId('lite-identity-sign-in-as')).toContainText(`Sign in as @${LITE_NAME}`);
    await expect(menu.getByTestId('lite-identity-upgrade')).toHaveCount(0);
  });

  test('LITE-GRAD-03: refusals are named and change nothing; a failed link is retried through /l2', async ({
    page,
    context
  }) => {
    await configureSigners(page, [SIGNER]);
    await stubSigners(context);
    await holdIdentity(page, securedIdentity(LITE_NAME, chainTimeIn(60)));
    const refusals: [string, number, string][] = [
      ['name_taken', 409, 'This name was taken in the meantime.'],
      ['daily_cap', 429, 'The gateway has created all the accounts it can today.'],
      ['graduation_disabled', 503, 'Upgrades are switched off on this gateway right now.'],
      ['creator_balance', 503, 'The gateway cannot pay for new accounts right now.']
    ];
    const answers: GraduateAnswer[] = refusals.map(([code, status]) => ({ status, json: { ok: false, code, message: code } }));
    answers.push({
      status: 202,
      json: { ok: true, account: LITE_NAME, create_trx_id: 'a'.repeat(40), link_trx_id: null, path: 'paid' }
    });
    const gateway = await mockGraduationGateway(page, eligibleView(), { answers });
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const dialog = await openGraduation(page);
    for (const [, , message] of refusals) {
      await dialog.getByTestId('lite-graduation-confirm').click();
      await expect(dialog.getByTestId('lite-graduation-error')).toContainText(message, { timeout: 30_000 });
      expect(await storedIdentity(page)).not.toHaveProperty('graduated');
      expect(await storedBinding(page, LITE_NAME)).toBeNull();
    }
    expect(gateway.graduated).toHaveLength(refusals.length);

    await dialog.getByTestId('lite-graduation-confirm').click();
    const outcome = dialog.getByTestId('lite-graduation-outcome');
    await expect(outcome).toHaveAttribute('data-phase', 'link_failed', { timeout: 30_000 });
    await expect(dialog.getByTestId('lite-graduation-step-linking')).toHaveAttribute('data-status', 'failed');
    expect(await storedIdentity(page)).toMatchObject({ graduated: LITE_NAME });
    expect(gateway.links).toEqual([]);

    await dialog.getByTestId('lite-graduation-retry-link').click();
    await expect(outcome).toHaveAttribute('data-phase', 'done', { timeout: 30_000 });
    expect(gateway.links).toHaveLength(1);
    expect(gateway.links[0].operations).toEqual([{ method: 'link', args: { name: LITE_NAME, account: LITE_NAME } }]);
    expect(gateway.graduated).toHaveLength(refusals.length + 1);
  });

  test('LITE-GRAD-04: the Passkey signer sign-in refuses a key off the posting authority and signs with a matching one', async ({
    page,
    context
  }) => {
    await configureSigners(page, [SIGNER]);
    await stubSigners(context);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const login = await openLoginDialog(page);
    await login.getByTestId('other-sign-in-options-button').click();
    await login.getByTestId('passkey-signer-button').click();
    await login.getByTestId('passkey-signin-username').fill(HIVE_ACCOUNT);
    await login.getByTestId('passkey-signin-find').click();
    await expect(login.getByTestId('passkey-signin-error')).toContainText(
      "The key your passkey signer derives is not on this account's posting authority",
      { timeout: 30_000 }
    );
    expect(await storedBinding(page, HIVE_ACCOUNT)).toBeNull();

    await context.unrouteAll();
    await stubSigners(context, { kind: 'answer', keys: { 4: HIVE_POSTING_KEY } });
    const requests = await recordSignerRequests(context);
    await login.getByTestId('passkey-signin-find').click();
    await expect(login.getByTestId('passkey-signin-found')).toContainText(`@${HIVE_ACCOUNT}`, { timeout: 30_000 });
    expect(await storedBinding(page, HIVE_ACCOUNT)).toEqual({ origin: SIGNER, publicKey: HIVE_POSTING_KEY });
    expect(requests.map((request) => [request.method, request.params])).toEqual([['getPublicKeys', { roles: [4], account: 0 }]]);

    await login.getByTestId('passkey-signin-submit').click();
    await expect.poll(() => requests.length, { timeout: 30_000 }).toBe(2);
    const { method, params } = requests[1];
    expect(method).toBe('signTransaction');
    expect(params.publicKey).toBe(HIVE_POSTING_KEY);
    const transaction = params.transaction as { operations: { type: string; value: { id: string; required_posting_auths: string[] } }[] };
    expect(transaction.operations[0].value).toMatchObject({ id: 'denser_passkey', required_posting_auths: [HIVE_ACCOUNT] });
    await expect
      .poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}')), { timeout: 30_000 })
      .toMatchObject({ isLoggedIn: true, username: HIVE_ACCOUNT, loginType: 'passkey', keyType: 'posting' });
    await expect(page.getByTestId('login-btn')).toBeHidden();
  });

  test('LITE-GRAD-05: a gateway that does not graduate shows none of it', async ({ page }) => {
    await holdIdentity(page, securedIdentity(LITE_NAME, chainTimeIn(60)));
    let asked = false;
    await mockGraduationGateway(page, eligibleView(), { graduates: false });
    await page.route('**/api/lite-gateway/names/*/graduation', (route) => {
      asked = true;
      return route.fulfill({ json: eligibleView() });
    });
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-forget')).toBeVisible();
    await expect(menu.getByTestId('lite-identity-upgrade')).toHaveCount(0);
    await expect(menu.getByTestId('lite-identity-graduated')).toHaveCount(0);
    await expect(page.getByTestId('lite-profile-upgrade')).toHaveCount(0);
    expect(asked).toBe(false);
  });
});
