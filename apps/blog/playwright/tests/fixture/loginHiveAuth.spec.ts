import type { Page, WebSocketRoute } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { TIMEOUTS } from '../support/constants';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * The HiveAuth sign-in's dialog: the QR code (and on a phone the `has://` link) of the session
 * request, Cancel, and a request that expires unanswered. Nothing is stored for the account until a
 * wallet app approves.
 *
 * The HAS relay is stubbed (`page.routeWebSocket`): it answers `auth_req` with `auth_wait`, the
 * request's id and expiry, as the public relay the fixture build is configured with (the default)
 * does; no wallet app ever answers.
 *
 * Fixtures: reuses `accountSwitchLogout`, which opens the sign-in dialog on the same page.
 */

test.use({ fixtureTestName: 'accountSwitchLogout' });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const USERNAME = 'gtg';
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = `${BASE_PATH}/faq.html`;
const RELAY = 'wss://hive-auth.arcange.eu';
// The sign-in loads the signing stack first
const SIGN_IN_TIMEOUT_MS = 30_000;
const EN = enSmartSigner.hiveauthservices;

interface Relay {
  /** The account of each `auth_req` the page sent */
  authRequests: string[];
}

/** Stands in for the HAS relay; each auth request waits `expiresInMs` for a wallet app that never answers. */
async function stubRelay(page: Page, expiresInMs = 60_000): Promise<Relay> {
  const relay: Relay = { authRequests: [] };
  await page.routeWebSocket(`${RELAY}/`, (ws: WebSocketRoute) => {
    ws.send(JSON.stringify({ cmd: 'connected', timeout: 60, version: 'stub', protocol: 0.8 }));
    ws.onMessage((message) => {
      const request = JSON.parse(String(message));
      if (request.cmd !== 'auth_req') return;
      relay.authRequests.push(request.account);
      const uuid = `request-${relay.authRequests.length}`;
      ws.send(JSON.stringify({ cmd: 'auth_wait', uuid, expire: Date.now() + expiresInMs, account: request.account }));
    });
  });
  return relay;
}

/** From the sign-in form's first step: "Other sign in options", the account, then HiveAuth */
async function startHiveAuth(loginForm: LoginForm): Promise<void> {
  await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await loginForm.otherSignInOptionsButton.click();
  await loginForm.otherSignInOptionsUsernameInput.fill(USERNAME);
  await expect(loginForm.hiveAuthButton).toBeEnabled();
  await loginForm.hiveAuthButton.click();
}

/** Starts HiveAuth in the sign-in dialog the header's Login opens */
async function openHiveAuthSignIn(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  await page.goto(PAGE_WITH_HEADER, { waitUntil: 'domcontentloaded' });
  await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await homePage.loginBtn.click();
  await startHiveAuth(new LoginForm(page));
}

const hiveAuthDialog = (page: Page) => page.getByTestId('hiveauth-dialog');

/** The HiveAuth data stored in localStorage, of any account */
const storedHiveAuthData = (page: Page): Promise<string[]> =>
  page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('hiveAuthData')));

test.describe('HiveAuth sign-in', { tag: '@basepath' }, () => {
  test('HIVEAUTH-01 — the CSP of the page admits the HAS relay HiveAuth talks to', async ({ page }) => {
    const response = await page.goto(PAGE_WITH_HEADER, { waitUntil: 'domcontentloaded' });
    const connectSrc = (response?.headers()['content-security-policy'] ?? '')
      .split(';')
      .find((directive) => directive.trim().startsWith('connect-src'));
    expect(connectSrc?.split(/\s+/)).toContain(RELAY);
  });

  test('HIVEAUTH-02 — the dialog shows the QR code of the session request and waits', async ({ page }) => {
    const relay = await stubRelay(page);
    await openHiveAuthSignIn(page);

    await expect(hiveAuthDialog(page)).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await expect(page.getByTestId('hiveauth-qr')).toBeVisible();
    await expect(page.getByTestId('hiveauth-status')).toHaveText(EN.qrInstructions);
    expect(relay.authRequests).toEqual([USERNAME]);

    // The link carries what the wallet app needs: the account, the request and the relay
    const link = page.getByTestId('hiveauth-open-wallet');
    await expect(link).toBeHidden();
    const href = (await link.getAttribute('href')) ?? '';
    expect(href.startsWith('has://auth_req/')).toBe(true);
    const payload = JSON.parse(Buffer.from(href.slice('has://auth_req/'.length), 'base64').toString());
    expect(payload).toMatchObject({ account: USERNAME, uuid: 'request-1', host: RELAY });
    expect(typeof payload.key).toBe('string');
    expect(await storedHiveAuthData(page)).toEqual([]);
  });

  test('HIVEAUTH-03 — Cancel closes the dialog, stores nothing, and HiveAuth can be started again', async ({
    page
  }) => {
    const relay = await stubRelay(page);
    await openHiveAuthSignIn(page);
    await expect(page.getByTestId('hiveauth-qr')).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });

    await page.getByTestId('hiveauth-cancel').click();

    await expect(hiveAuthDialog(page)).toBeHidden();
    expect(await storedHiveAuthData(page)).toEqual([]);
    const loginForm = new LoginForm(page);
    await expect(loginForm.hiveAuthButton).toBeEnabled();
    await loginForm.hiveAuthButton.click();
    await expect(page.getByTestId('hiveauth-qr')).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    expect(relay.authRequests).toEqual([USERNAME, USERNAME]);
  });

  test('HIVEAUTH-04 — a request no wallet app answers in time says so until closed', async ({ page }) => {
    await stubRelay(page, 2_000);
    await openHiveAuthSignIn(page);
    await expect(page.getByTestId('hiveauth-qr')).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });

    await expect(page.getByTestId('hiveauth-status')).toHaveText(EN.requestExpired, { timeout: 10_000 });
    await expect(page.getByTestId('hiveauth-qr')).toBeHidden();

    await page.getByTestId('hiveauth-close').click();
    await expect(hiveAuthDialog(page)).toBeHidden();
    expect(await storedHiveAuthData(page)).toEqual([]);
  });
});

test.describe('HiveAuth sign-in on a phone', { tag: '@basepath' }, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('HIVEAUTH-05 — offers the link that opens the wallet app, with the QR code below it', async ({ page }) => {
    await stubRelay(page);
    // A phone's header puts Login in its menu: the sign-in page has the same form
    await page.goto(`${BASE_PATH}/login`, { waitUntil: 'domcontentloaded' });
    await startHiveAuth(new LoginForm(page));

    const link = page.getByTestId('hiveauth-open-wallet');
    await expect(link).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await expect(link).toHaveText(EN.openInWallet);
    await expect(page.getByTestId('hiveauth-qr')).toBeVisible();
  });
});
