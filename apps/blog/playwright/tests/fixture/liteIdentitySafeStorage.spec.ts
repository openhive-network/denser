import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  configureSigners,
  holdIdentity,
  keyMember,
  mockPasskeyGateway,
  openLoginDialog,
  relayInfo,
  ROOT_KEY,
  SIGNER,
  storedIdentity,
  stubSigners,
  TEST_KEYS,
  unsecuredIdentity,
  type Authority
} from '../support/litePasskeyContext';
import {
  liteStorageKeys,
  liteWalletUsername,
  recoveredKeys,
  reportPasskeySupport,
  SAFE_STORAGE_PASSWORD,
  secureInSafeStorage,
  unlockWith,
  walletAliases
} from '../support/liteSafeStorageContext';

/**
 * Securing a lite account's keys in Safe Storage (hb-auth's Beekeeper wallet, run in the browser),
 * on the `liteSocial` recording (steem-16; its lite profile `lite-smoke-1016`). The gateway's `/l2`
 * (and, where a passkey signer is configured, its authority read) is answered in the browser, as
 * `support/litePasskeyContext.ts` does; the relayed signatures are recovered with
 * @hiveio/lite-account. The biometric unlock is not driven (no PRF here): only its offer is. The
 * social ops act as `crisp-koala-499`, whose follows the recording has; the profile and the passkey
 * flow are `lite-smoke-1016`'s.
 *
 *   LITE-ID-16 – no passkey signer: the menu offers Secure in Safe Storage; a password moves both
 *                keys into the wallet under the lite entry, the record keeps none
 *                (`keyStore: safe-storage`), the menu shows the entry unlocked, a follow is signed
 *                by the posting key in the wallet, and the Hive sign-in lists no lite entry
 *   LITE-ID-17 – Lock in the menu: the next follow opens the unlock step; a wrong password shows
 *                hb-auth's message and sends nothing; the right one sends the follow, not retyped
 *   LITE-ID-18 – the profile notice offers Secure in Safe Storage; then Forget: the dialog says the
 *                account is lost, the wallet's keys of the entry and every `lite-` key are removed
 *   LITE-ID-19 – a configured passkey signer: the Secure dialog offers Safe Storage too; then the
 *                passkey flow signs its owner edits with the owner key in the wallet
 *   LITE-ID-20 – where the browser supports passkeys, securing offers the biometric unlock once;
 *                "Not now" closes it and is remembered for the entry
 */

const LITE_NAME = 'lite-smoke-1016';
const PROFILE = `/@did:lite:${LITE_NAME}`;
const GUEST_NAME = 'crisp-koala-499';
const HIVE_AUTHOR = 'test-gateway-1';
const WALLET_USER = liteWalletUsername(LITE_NAME, TEST_KEYS.postingPublicKey);
const GUEST_WALLET_USER = liteWalletUsername(GUEST_NAME, TEST_KEYS.postingPublicKey);

const unsecuredAuthority = (): Authority => ({
  owner: [keyMember(TEST_KEYS.ownerPublicKey)],
  posting: [keyMember(TEST_KEYS.postingPublicKey)]
});

async function openMenu(page: Page) {
  const menu = page.getByTestId('lite-identity-menu');
  await expect(async () => {
    if (!(await menu.isVisible())) await page.getByTestId('lite-identity-button').click();
    await expect(menu).toBeVisible({ timeout: 2_000 });
  }).toPass();
  return menu;
}

/**
 * The gateway as `mockPasskeyGateway` answers it, its /info also relaying mute: the profile's lite
 * Follow comes with a lite Mute, which tells it from the sign-in Follow the server renders.
 */
async function mockGateway(page: Page, relaysAuthority = false) {
  const gateway = await mockPasskeyGateway(page, LITE_NAME, unsecuredAuthority(), relaysAuthority);
  const info = relayInfo(relaysAuthority);
  info.limits.l2.apps.lite_social_test.push('mute', 'unmute');
  await page.route('**/api/lite-reply', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: info }) : route.fallback()
  );
  return gateway;
}

/** Opens Secure in Safe Storage from the menu and secures the keys with the default password. */
async function secureFromMenu(page: Page) {
  const menu = await openMenu(page);
  await menu.getByTestId('lite-identity-secure-safe-storage').click();
  const dialog = await secureInSafeStorage(page);
  await expect(dialog).toHaveCount(0, { timeout: 60_000 });
}

/**
 * The Follow button of the Hive author's profile, once the lite buttons replaced the sign-in one,
 * and the op a click sends: the recorded lite account may follow the author already.
 */
async function followButton(page: Page) {
  await expect(page.getByTestId('profile-mute-button').first()).toBeVisible();
  const button = page.getByTestId('profile-follow-button').first();
  const label = (await button.textContent())?.trim() ?? '';
  return { button, label, method: label === 'Follow' ? 'follow' : 'unfollow' };
}

test.use({ fixtureTestName: 'liteSocial' });

test.describe('Lite account keys in Safe Storage (fixture-based, mocked gateway)', () => {
  // The suite's build configures a passkey signer; these tests have none unless they say so
  test.beforeEach(async ({ page }) => {
    await configureSigners(page, []);
    await reportPasskeySupport(page, false);
  });

  test('LITE-ID-16: Secure in Safe Storage moves the keys into the wallet and signs with them', async ({ page }) => {
    await holdIdentity(page, unsecuredIdentity(GUEST_NAME));
    const gateway = await mockGateway(page);
    await page.goto(`/@${HIVE_AUTHOR}`, { waitUntil: 'domcontentloaded' });
    const menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-secure')).toHaveCount(0);
    await menu.getByTestId('lite-identity-secure-safe-storage').click();
    const dialog = page.getByTestId('lite-secure-dialog');
    await expect(dialog).toHaveAttribute('data-mode', 'safe-storage');
    await expect(dialog.getByTestId('lite-secure-use-safe-storage')).toHaveCount(0);
    await secureInSafeStorage(page);
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });

    const stored = await storedIdentity(page);
    expect(stored).toMatchObject({
      name: GUEST_NAME,
      keyStore: 'safe-storage',
      ownerPublicKey: TEST_KEYS.ownerPublicKey,
      postingPublicKey: TEST_KEYS.postingPublicKey
    });
    expect(stored).not.toHaveProperty('ownerWif');
    expect(stored).not.toHaveProperty('postingWif');
    expect(await walletAliases(page)).toEqual(
      expect.arrayContaining([`${GUEST_WALLET_USER}@owner`, `${GUEST_WALLET_USER}@posting`])
    );
    expect((await walletAliases(page)).some((alias) => alias.startsWith(`${GUEST_NAME}@`))).toBe(false);

    await openMenu(page);
    await expect(menu.getByTestId('lite-wallet-state')).toHaveAttribute('data-unlocked', 'true');
    await expect(menu.getByTestId('lite-identity-secure-safe-storage')).toHaveCount(0);
    await page.keyboard.press('Escape');

    const follow = await followButton(page);
    await follow.button.click();
    await expect(follow.button).not.toHaveText(follow.label);
    await expect.poll(() => gateway.relayed.length, { timeout: 30_000 }).toBe(1);
    expect(gateway.relayed[0].operations[0]).toMatchObject({ method: follow.method });
    expect(recoveredKeys(gateway.relayed)).toEqual([[TEST_KEYS.postingPublicKey]]);

    // The Hive Safe Storage sign-in lists the Hive accounts only: this browser holds none
    await openMenu(page);
    await menu.getByTestId('lite-identity-sign-in').click();
    const login = await openLoginDialog(page);
    const username = login.getByTestId('username-input');
    await expect(username).toBeVisible();
    await expect(username).toHaveValue('');
    await expect(username.locator('xpath=..').locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });

  test('LITE-ID-17: a locked entry asks to unlock; a wrong password sends nothing', async ({ page }) => {
    await holdIdentity(page, unsecuredIdentity(GUEST_NAME));
    const gateway = await mockGateway(page);
    await page.goto(`/@${HIVE_AUTHOR}`, { waitUntil: 'domcontentloaded' });
    await secureFromMenu(page);

    const menu = await openMenu(page);
    await menu.getByTestId('lite-wallet-lock').click();
    await openMenu(page);
    await expect(menu.getByTestId('lite-wallet-state')).toHaveAttribute('data-unlocked', 'false');
    await expect(menu.getByTestId('lite-wallet-lock')).toHaveCount(0);
    await page.keyboard.press('Escape');

    const follow = await followButton(page);
    await follow.button.click();
    await unlockWith(page, 'not the password');
    await expect(page.getByText('Safe Storage did not unlock', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Invalid credentials', { exact: true })).toBeVisible();
    await expect(follow.button).toHaveText(follow.label);
    expect(gateway.relayed).toEqual([]);

    await follow.button.click();
    await unlockWith(page, SAFE_STORAGE_PASSWORD);
    await expect(follow.button).not.toHaveText(follow.label, { timeout: 30_000 });
    await expect.poll(() => gateway.relayed.length, { timeout: 30_000 }).toBe(1);
    expect(gateway.relayed[0].operations[0]).toMatchObject({ method: follow.method });
    expect(recoveredKeys(gateway.relayed)).toEqual([[TEST_KEYS.postingPublicKey]]);
  });

  test('LITE-ID-18: the profile notice secures in Safe Storage; Forget removes the entry and every lite key', async ({
    page
  }) => {
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    await mockGateway(page);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });
    const notice = page.getByTestId('lite-security-notice');
    await expect(notice).toHaveAttribute('data-warning', 'unsecured');
    await expect(notice).toContainText('Secure them in Safe Storage');
    await notice.getByTestId('lite-security-secure').click();
    await expect(page.getByTestId('lite-secure-dialog')).toHaveAttribute('data-mode', 'safe-storage');
    await expect(await secureInSafeStorage(page)).toHaveCount(0, { timeout: 60_000 });
    await expect(notice).toHaveCount(0);
    expect(await walletAliases(page)).toEqual(expect.arrayContaining([`${WALLET_USER}@posting`]));

    const menu = await openMenu(page);
    await menu.getByTestId('lite-identity-forget').click();
    const dialog = page.getByTestId('lite-forget-dialog');
    await expect(dialog.locator('[data-variant]')).toHaveAttribute('data-variant', 'safe_storage');
    await expect(dialog).toContainText("Its keys are kept only in this browser's Safe Storage");
    await expect(dialog).toContainText('nobody can post, edit or delete as this lite account again');
    await dialog.getByTestId('lite-forget-confirm').click();

    await expect(page.getByTestId('lite-identity-button')).toHaveCount(0, { timeout: 30_000 });
    expect(await liteStorageKeys(page)).toEqual([]);
    const aliases = await walletAliases(page);
    expect(aliases).not.toContain(`${WALLET_USER}@owner`);
    expect(aliases).not.toContain(`${WALLET_USER}@posting`);
  });

  test('LITE-ID-19: with a passkey signer, Safe Storage is offered too, and holds the owner key for the passkey flow', async ({
    page,
    context
  }) => {
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    await configureSigners(page, [SIGNER]);
    await stubSigners(context);
    const gateway = await mockGateway(page, true);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    let menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-secure-safe-storage')).toHaveCount(0);
    await menu.getByTestId('lite-identity-secure').click();
    const dialog = page.getByTestId('lite-secure-dialog');
    await expect(dialog).toHaveAttribute('data-mode', 'passkey');
    await dialog.getByTestId('lite-secure-use-safe-storage').click();
    await expect(dialog).toHaveAttribute('data-mode', 'safe-storage');
    await secureInSafeStorage(page);
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });
    expect(await storedIdentity(page)).toMatchObject({ keyStore: 'safe-storage', secured: false });

    // The owner key is in the wallet now: the passkey flow signs its two edits with it
    menu = await openMenu(page);
    await menu.getByTestId('lite-identity-secure').click();
    await expect(dialog).toHaveAttribute('data-mode', 'passkey');
    await expect(dialog.getByTestId('lite-secure-use-safe-storage')).toHaveCount(0);
    await dialog.getByTestId('lite-secure-connect').click();
    await expect(dialog.getByTestId('lite-secure-passkey-label')).toBeVisible({ timeout: 30_000 });
    await dialog.getByTestId('lite-secure-confirm').click();
    await expect(dialog).toHaveCount(0, { timeout: 60_000 });

    expect(gateway.relayed.map((tx) => tx.operations[0].args.role)).toEqual(['posting', 'owner']);
    expect(recoveredKeys(gateway.relayed)).toEqual([[TEST_KEYS.ownerPublicKey], [TEST_KEYS.ownerPublicKey]]);
    expect(await storedIdentity(page)).toMatchObject({ keyStore: 'safe-storage', secured: true, ownerPublicKey: ROOT_KEY });
    const aliases = await walletAliases(page);
    expect(aliases).toContain(`${WALLET_USER}@posting`);
    expect(aliases).not.toContain(`${WALLET_USER}@owner`);
  });

  test('LITE-ID-20: securing offers the biometric unlock where passkeys are supported, once', async ({ page }) => {
    await reportPasskeySupport(page, true);
    await holdIdentity(page, unsecuredIdentity(GUEST_NAME));
    await mockGateway(page);
    await page.goto(`/@${HIVE_AUTHOR}`, { waitUntil: 'domcontentloaded' });

    const menu = await openMenu(page);
    await menu.getByTestId('lite-identity-secure-safe-storage').click();
    const dialog = await secureInSafeStorage(page);
    const prompt = dialog.getByTestId('passkey-prompt');
    await expect(prompt).toBeVisible({ timeout: 60_000 });
    await expect(prompt).toContainText('Enable biometric unlock?');
    expect(await storedIdentity(page)).toMatchObject({ keyStore: 'safe-storage' });

    await prompt.getByTestId('passkey-prompt-not-now').click();
    await expect(dialog).toHaveCount(0);
    const dismissal = await page.evaluate(
      (username) => window.localStorage.getItem(`passkey-dismissed-${username}`),
      GUEST_WALLET_USER
    );
    expect(dismissal).toContain('later');
  });
});
