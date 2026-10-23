import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  ACCOUNT_APP,
  chainTimeIn,
  configureSigners,
  holdIdentity,
  keyMember,
  mockPasskeyGateway,
  OTHER_DEVICE_KEY,
  OTHER_SIGNER,
  ROOT_KEY,
  securedIdentity,
  SIGNER,
  storedIdentity,
  stubSigners,
  TEST_KEYS,
  unsecuredIdentity,
  type Authority
} from '../support/litePasskeyContext';

/**
 * Securing a lite account with a passkey, its devices and signing out, on the `liteSocial`
 * recording (steem-16; its lite profile `lite-smoke-1016`). The gateway's authority read and `/l2`
 * are answered in the browser from one authority the relayed `update_authority` ops edit; the
 * signer popup is a stub speaking the hive-passkey-signer protocol (no network in fixture runs,
 * so the real signer and its passkey are not reachable).
 *
 *   LITE-ID-01 – Secure with one configured signer: its popup opens directly; the stored identity
 *                drops its owner key; the owner is the root with `kind: passkey` and that signer
 *   LITE-ID-02 – Secure with two configured signers asks which before any popup opens
 *   LITE-ID-04 – Sign out removes this device's posting key, then the browser forgets the account
 *   LITE-ID-05 – Devices: labels and dates; Renew extends only this device; Remove another device
 *   LITE-ID-06 – the "lives only in this browser" warning, the backup note, and neither, in the
 *                menu and on the profile
 *   LITE-ID-07 – a gateway that does not relay update_authority: no passkey UI, Forget unchanged
 *   LITE-ID-08 – a popup closed by the user changes nothing, silently; a signer error is named
 *
 * LITE-ID-03 (sign in on a fresh browser) and LITE-ID-09 (the first-post prompt) are in
 * liteIdentityPasskeySignIn.spec.ts, on the `litePost` recording, whose post takes a guest reply.
 */

const LITE_NAME = 'lite-smoke-1016';
const LITE_DID = `did:lite:${LITE_NAME}`;
const PROFILE = `/@${LITE_DID}`;

const unsecuredAuthority = (): Authority => ({
  owner: [keyMember(TEST_KEYS.ownerPublicKey)],
  posting: [keyMember(TEST_KEYS.postingPublicKey)]
});

const securedAuthority = (deviceExpires: string, extraOwner = false): Authority => ({
  owner: [
    keyMember(ROOT_KEY, { meta: { kind: 'passkey', signer: SIGNER } }),
    ...(extraOwner ? [keyMember(OTHER_DEVICE_KEY, { meta: { kind: 'backup', signer: SIGNER } })] : [])
  ],
  posting: [
    keyMember(TEST_KEYS.postingPublicKey, {
      expires: deviceExpires,
      meta: { kind: 'device', label: 'Chrome · Linux', signer: SIGNER }
    }),
    keyMember(OTHER_DEVICE_KEY, {
      expires: chainTimeIn(60),
      meta: { kind: 'device', label: 'Firefox · Android', signer: SIGNER }
    })
  ]
});

async function openMenu(page: Page) {
  await page.getByTestId('lite-identity-button').click();
  return page.getByTestId('lite-identity-menu');
}

test.use({ fixtureTestName: 'liteSocial' });

test.describe('Lite account passkey (fixture-based, mocked gateway and signer)', () => {
  test('LITE-ID-01: Secure with one signer opens it directly and drops the owner key', async ({
    page,
    context
  }) => {
    await configureSigners(page, [SIGNER]);
    const opened = await stubSigners(context);
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    const gateway = await mockPasskeyGateway(page, LITE_NAME, unsecuredAuthority());
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const menu = await openMenu(page);
    await expect(menu.getByTestId('lite-security-notice')).toHaveAttribute('data-warning', 'unsecured');
    await menu.getByTestId('lite-identity-secure').click();
    const dialog = page.getByTestId('lite-secure-dialog');
    await expect(dialog.getByTestId('lite-signer-picker')).toHaveCount(0);
    const popup = page.waitForEvent('popup');
    await dialog.getByTestId('lite-secure-confirm').click();
    expect((await popup).url()).toBe(`${SIGNER}/sign/`);
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    // The device's posting key restated with an expiry and its meta, then the owner as the root.
    expect(gateway.relayed.map((tx) => [tx.app, tx.operations[0].args.role])).toEqual([
      [ACCOUNT_APP, 'posting'],
      [ACCOUNT_APP, 'owner']
    ]);
    const [device] = gateway.relayed[0].operations[0].args.authority.key_auths;
    expect(device).toMatchObject({
      member: { value: TEST_KEYS.postingPublicKey },
      meta: { kind: 'device', signer: SIGNER }
    });
    expect(Date.parse(`${device.expires}Z`) - Date.now()).toBeGreaterThan(89 * 86_400_000);
    expect(gateway.relayed[1].operations[0].args.authority.key_auths).toEqual([
      { member: { type: 'secp256k1', value: ROOT_KEY }, weight: 1, meta: { kind: 'passkey', signer: SIGNER } }
    ]);
    expect(gateway.relayed[1].signatures).toHaveLength(1);
    expect(opened).toEqual([SIGNER]);

    const stored = await storedIdentity(page);
    expect(stored).toMatchObject({
      name: LITE_NAME,
      secured: true,
      signer: SIGNER,
      ownerPublicKey: ROOT_KEY
    });
    expect(stored).not.toHaveProperty('ownerWif');
    await page.getByTestId('lite-identity-button').click();
    await expect(menu.getByTestId('lite-identity-sign-out')).toBeVisible();
    await expect(menu.getByTestId('lite-identity-secure')).toHaveCount(0);
  });

  test('LITE-ID-02: Secure with two signers asks which before any popup opens', async ({ page, context }) => {
    await configureSigners(page, [SIGNER, OTHER_SIGNER]);
    const opened = await stubSigners(context);
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    const gateway = await mockPasskeyGateway(page, LITE_NAME, unsecuredAuthority());
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    await page.getByTestId('lite-security-secure').click();
    const dialog = page.getByTestId('lite-secure-dialog');
    const options = dialog.getByTestId('lite-signer-option');
    await expect(options).toHaveCount(2);
    await expect(dialog.getByTestId('lite-signer-picker')).toContainText('signer.hive.blog');
    expect(opened).toEqual([]);
    await dialog.locator(`[data-origin="${OTHER_SIGNER}"]`).click();
    await dialog.getByTestId('lite-secure-confirm').click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });

    expect(opened).toEqual([OTHER_SIGNER]);
    expect(gateway.relayed.at(-1)?.operations[0].args.authority.key_auths[0].meta).toEqual({
      kind: 'passkey',
      signer: OTHER_SIGNER
    });
    expect(await storedIdentity(page)).toMatchObject({ signer: OTHER_SIGNER });
  });

  test('LITE-ID-04: Sign out removes this device key, then forgets the account', async ({ page }) => {
    await holdIdentity(page, securedIdentity(LITE_NAME, chainTimeIn(80)));
    const gateway = await mockPasskeyGateway(page, LITE_NAME, securedAuthority(chainTimeIn(80)));
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    const menu = await openMenu(page);
    await menu.getByTestId('lite-identity-sign-out').click();
    await page.getByTestId('lite-sign-out-dialog').getByTestId('lite-sign-out-confirm').click();
    await expect(page.getByTestId('lite-identity-button')).toHaveCount(0, { timeout: 30_000 });

    expect(gateway.relayed).toHaveLength(1);
    expect(gateway.relayed[0].operations[0].args.role).toBe('posting');
    expect(gateway.relayed[0].operations[0].args.authority.key_auths.map((key) => key.member.value)).toEqual([
      OTHER_DEVICE_KEY
    ]);
    expect(gateway.authority.posting.map((member) => member.value)).toEqual([OTHER_DEVICE_KEY]);
    expect(await storedIdentity(page)).toBeNull();
  });

  test('LITE-ID-05: Devices lists the keys; Renew extends this one, Remove drops another', async ({
    page,
    context
  }) => {
    const soon = chainTimeIn(5);
    const opened = await stubSigners(context);
    await holdIdentity(page, securedIdentity(LITE_NAME, soon));
    const initial = securedAuthority(soon);
    const otherExpires = initial.posting[1].expires;
    const gateway = await mockPasskeyGateway(page, LITE_NAME, initial);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    // The expiring key is announced on every page, linking the Devices tab.
    await page.getByTestId('lite-device-expiry-link').click();
    await expect(page).toHaveURL(new RegExp(`${PROFILE}/devices$`));
    const rows = page.getByTestId('lite-device-row');
    await expect(rows.getByTestId('lite-device-label')).toContainText([
      'Chrome · Linux',
      'Firefox · Android'
    ]);
    await expect(rows.first().getByTestId('lite-device-until')).toContainText('Valid until');
    const here = page.locator('[data-testid="lite-device-row"][data-current="true"]');
    await expect(here.getByTestId('lite-device-remove')).toHaveCount(0);

    await here.getByTestId('lite-device-renew').click();
    await expect(here.getByTestId('lite-device-renew')).toHaveCount(0, { timeout: 30_000 });
    const renewed = gateway.relayed[0].operations[0].args.authority.key_auths;
    expect(renewed.map((key) => key.member.value)).toEqual([TEST_KEYS.postingPublicKey, OTHER_DEVICE_KEY]);
    expect(Date.parse(`${renewed[0].expires}Z`) - Date.now()).toBeGreaterThan(89 * 86_400_000);
    expect(renewed[1].expires).toBe(otherExpires);
    await expect(page.getByTestId('lite-device-expiry-banner')).toHaveCount(0);

    await page.locator(`[data-key="${OTHER_DEVICE_KEY}"]`).getByTestId('lite-device-remove').click();
    await expect(rows).toHaveCount(1, { timeout: 30_000 });
    expect(gateway.relayed[1].operations[0].args.authority.key_auths.map((key) => key.member.value)).toEqual([
      TEST_KEYS.postingPublicKey
    ]);
    expect(opened).toEqual([SIGNER, SIGNER]);
  });

  const WARNING_CASES = [
    {
      title: 'an unsecured identity gets the "lives only in this browser" warning',
      secured: false,
      backup: false,
      warning: 'unsecured'
    },
    {
      title: 'a single passkey and no backup gets the backup note',
      secured: true,
      backup: false,
      warning: 'add_backup'
    },
    { title: 'a backup member present gets neither', secured: true, backup: true, warning: null }
  ] as const;

  for (const { title, secured, backup, warning } of WARNING_CASES) {
    test(`LITE-ID-06: ${title}`, async ({ page }) => {
      const expires = chainTimeIn(80);
      await holdIdentity(page, secured ? securedIdentity(LITE_NAME, expires) : unsecuredIdentity(LITE_NAME));
      await mockPasskeyGateway(
        page,
        LITE_NAME,
        secured ? securedAuthority(expires, backup) : unsecuredAuthority()
      );
      await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByTestId('profile-navigation').getByRole('link', { name: 'Devices', exact: true })
      ).toBeVisible();

      const profileNotice = page.getByTestId('lite-security-notice');
      if (warning === null) await expect(profileNotice).toHaveCount(0);
      else await expect(profileNotice).toHaveAttribute('data-warning', warning);
      if (warning === 'unsecured') {
        await expect(profileNotice).toHaveText(
          /This account lives only in this browser\. Secure it with a passkey\./
        );
        await expect(profileNotice.getByTestId('lite-security-secure')).toBeVisible();
      } else if (warning === 'add_backup') {
        await expect(profileNotice).toContainText('Consider adding a backup');
        await expect(profileNotice.getByTestId('lite-security-secure')).toHaveCount(0);
      }

      const menu = await openMenu(page);
      await expect(
        menu.getByTestId(secured ? 'lite-identity-sign-out' : 'lite-identity-secure')
      ).toBeVisible();
      const menuNotice = menu.getByTestId('lite-security-notice');
      if (warning === null) await expect(menuNotice).toHaveCount(0);
      else await expect(menuNotice).toHaveAttribute('data-warning', warning);
    });
  }

  test('LITE-ID-07: without update_authority relay there is no passkey UI', async ({ page }) => {
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    await mockPasskeyGateway(page, LITE_NAME, unsecuredAuthority(), false);
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByTestId('profile-navigation').getByRole('link', { name: 'Feed', exact: true })
    ).toBeVisible();
    await expect(
      page.getByTestId('profile-navigation').getByRole('link', { name: 'Devices', exact: true })
    ).toHaveCount(0);
    await expect(page.getByTestId('lite-security-notice')).toHaveCount(0);
    const menu = await openMenu(page);
    await expect(menu.getByTestId('lite-identity-forget')).toBeVisible();
    await expect(menu.getByTestId('lite-identity-secure')).toHaveCount(0);
    await expect(menu.getByTestId('lite-identity-sign-out')).toHaveCount(0);
    await expect(menu.getByTestId('lite-security-notice')).toHaveCount(0);
    await menu.getByTestId('lite-identity-forget').click();
    const description = page.getByTestId('lite-forget-dialog').locator('[data-variant]');
    await expect(description).toHaveAttribute('data-variant', 'plain');
    await expect(description).toContainText('Its key is kept only in this browser');
  });

  test('LITE-ID-08: a closed popup changes nothing silently; a signer error is named', async ({
    page,
    context
  }) => {
    await configureSigners(page, [SIGNER]);
    await stubSigners(context, { kind: 'close' });
    await holdIdentity(page, unsecuredIdentity(LITE_NAME));
    const gateway = await mockPasskeyGateway(page, LITE_NAME, unsecuredAuthority());
    await page.goto(PROFILE, { waitUntil: 'domcontentloaded' });

    await page.getByTestId('lite-security-secure').click();
    const dialog = page.getByTestId('lite-secure-dialog');
    const popup = page.waitForEvent('popup');
    await dialog.getByTestId('lite-secure-confirm').click();
    await (await popup).waitForEvent('close');
    await expect(dialog.getByTestId('lite-secure-pending')).toHaveCount(0, { timeout: 10_000 });
    await expect(dialog.getByTestId('lite-secure-confirm')).toBeEnabled();
    await expect(page.getByText('The passkey action failed')).toHaveCount(0);
    expect(gateway.relayed).toEqual([]);
    expect(await storedIdentity(page)).toMatchObject({ ownerWif: TEST_KEYS.ownerWif });

    await context.unrouteAll();
    await stubSigners(context, { kind: 'error', code: 'key_not_found' });
    await dialog.getByTestId('lite-secure-confirm').click();
    await expect(
      page.getByText("This passkey does not hold the account's key.", { exact: false })
    ).toBeVisible();
    expect(gateway.relayed).toEqual([]);
  });
});
