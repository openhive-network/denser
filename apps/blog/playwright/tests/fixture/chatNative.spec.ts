import type { Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { TIMEOUTS } from '../support/constants';
import { configureChat } from '../support/chatSettings';
import { recordWasmRequests } from '../support/wasmRequests';
import { CHUNK_MARKERS, findMarkersInInitialChunks, withoutChunkPaths } from '../support/initialChunks';
import {
  GENERAL_MESSAGES,
  GENERAL_ROOM,
  HOMESERVER,
  LOBBY_MESSAGE,
  MatrixHomeserverStub,
  OLDER_GENERAL_MESSAGE,
  SERVER_NAME,
  UNREAD
} from '../support/matrixHomeserverStub';
import enBlog from '../../../locales/en/common_blog.json';
import plBlog from '../../../locales/pl/common_blog.json';

/**
 * The native Matrix chat client in the chat drawer (`MATRIX_CHAT_CLIENT` unset: the default).
 * The settings are appended to `__ENV.js` (see chatSettings.ts), the build's CSP is bypassed, and
 * the homeserver is answered by MatrixHomeserverStub; denser's login token route answers a token.
 *
 * The client loads and signs in with the warm-up (on idle after the page loads, or on intent to
 * use the chat button), so the badge can show before the drawer opens.
 *
 * Fixtures: reuses `accountSwitchLogout`, which loads the same page for a signed-in user.
 */

const PAGE_WITH_HEADER = '/faq.html';
const USER_ID = `@${DEFAULT_USER.username}:${SERVER_NAME}`;
const ELEMENT = 'https://chat.matrix.test';
const LOGIN_TOKEN = 'syl_native_login_token';
const EN = enBlog.chat_widget;
const NATIVE_SETTINGS = {
  CHAT_PROVIDER: 'matrix',
  MATRIX_ELEMENT_URL: ELEMENT,
  MATRIX_HOMESERVER_URL: HOMESERVER
};
/** Past the idle warm-up's start (see chatWidget.spec.ts), with the sign-in and first sync */
const SIGNED_IN_TIMEOUT_MS = 20_000;
const STORED_SESSION_KEY = `matrix-chat-session-${USER_ID}`;
/** The wait a rate-limited token route names in CHAT-NATIVE-10 */
const RETRY_AFTER_MS = 500;
/** A window too short for the timeline to hold #general's first messages without a scroll */
const SHORT_VIEWPORT_PX = 240;
/** More Tab stops than one lap of the drawer has */
const MAX_LAP_STOPS = 20;

test.use({
  fixtureTestName: 'accountSwitchLogout',
  bypassCSP: true,
  authenticatedUser: { strict: true, authenticateOnBackend: true, oauthConsent: { openhive_chat: true } }
});

const chatButton = (page: Page) => page.getByRole('button', { name: EN.open_widget });
const badge = (page: Page) => page.getByTestId('chat-unread-badge');
const panel = (page: Page) => page.getByTestId('matrix-chat-panel');
const messages = (page: Page) => panel(page).getByTestId('chat-message');
const signInFailed = (page: Page) => page.getByRole('dialog').getByRole('alert').getByText(EN.sign_in_failed);
const composer = (page: Page) => panel(page).getByRole('textbox', { name: EN.composer_label });
const focusInDrawer = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null && document.hasFocus());

interface NativeChat {
  homeserver: MatrixHomeserverStub;
  loginTokenRequests: Request[];
  /** How many of the first token requests are answered 429 */
  rateLimited: number;
}

/** Routes `page`'s chat to the stubbed homeserver and token route of `chat`, a new one by default */
async function usesNativeChat(page: Page, settings: Record<string, string> = NATIVE_SETTINGS, chat?: NativeChat) {
  await configureChat(page, settings);
  const routed = chat ?? { homeserver: new MatrixHomeserverStub(USER_ID), loginTokenRequests: [], rateLimited: 0 };
  await routed.homeserver.install(page);
  await page.route('**/api/chat/matrix-login-token', (route) => {
    routed.loginTokenRequests.push(route.request());
    if (routed.loginTokenRequests.length <= routed.rateLimited) {
      return route.fulfill({ status: 429, json: { error: 'Rate-limited', retry_after_ms: RETRY_AFTER_MS } });
    }
    return route.fulfill({ json: { loginToken: LOGIN_TOKEN } });
  });
  return routed;
}

/** Answers of 400 and above to `page`'s requests from now on, as `METHOD url status` */
function recordFailedResponses(page: Page): string[] {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.request().method()} ${response.url()} ${response.status()}`);
  });
  return failed;
}

async function signOut(page: Page): Promise<void> {
  await new HomePage(page).profileAvatarButton.click();
  await new ProfileUserMenu(page).logoutLink.click();
}

const storedSession = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.value ?? null, STORED_SESSION_KEY);

async function openPage(page: Page): Promise<void> {
  await page.goto(PAGE_WITH_HEADER);
  await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
}

async function openChat(page: Page): Promise<void> {
  await openPage(page);
  await chatButton(page).click();
  await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });
}

test.describe('Native Matrix chat client', () => {
  test('CHAT-NATIVE-01: signs in with the login token from denser on a stable device, and opens in #general', async ({
    page
  }) => {
    const { homeserver, loginTokenRequests } = await usesNativeChat(page);
    const wasmRequests = recordWasmRequests(page);
    await openChat(page);

    expect(loginTokenRequests.map((request) => request.method())).toEqual(['POST']);
    const [login] = homeserver.requestsTo('/login', 'POST');
    expect(login.body).toMatchObject({ type: 'm.login.token', token: LOGIN_TOKEN });
    const deviceId = Reflect.get(Object(login.body), 'device_id');
    expect(deviceId).toMatch(/^DENSER[0-9A-F]{12}$/);
    const [filter] = homeserver.requestsTo('/filter', 'POST');
    expect(filter.body).toMatchObject({ room: { state: { lazy_load_members: true } } });

    await expect(messages(page).filter({ hasText: GENERAL_MESSAGES[0] })).toBeVisible();
    await expect(messages(page).filter({ hasText: GENERAL_MESSAGES[0] })).toContainText('Bob');
    const link = messages(page).getByRole('link', { name: 'https://hive.blog/trending' });
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(panel(page).getByRole('button', { name: /general/ })).toHaveAttribute('aria-current', 'true');
    // No crypto: the client never fetches matrix-sdk-crypto-wasm
    expect(wasmRequests.filter((url) => url.includes('matrix'))).toEqual([]);
    expect(await storedSession(page)).toMatchObject({ userId: USER_ID, deviceId });
  });

  test('CHAT-NATIVE-02: a sent message shows as sending, then in the timeline; a failed one can be retried', async ({
    page
  }) => {
    const { homeserver } = await usesNativeChat(page);
    await openChat(page);

    await composer(page).fill('Hello from denser');
    await composer(page).press('Enter');
    await expect.poll(() => homeserver.requestsWith('/send/m.room.message/', 'PUT').length).toBe(1);
    const [sent] = homeserver.requestsWith('/send/m.room.message/', 'PUT');
    expect(sent.body).toEqual({ msgtype: 'm.text', body: 'Hello from denser' });
    await expect(composer(page)).toHaveValue('');
    const txnId = sent.path.split('/').at(-1) ?? '';
    homeserver.queueMessages(GENERAL_ROOM, [{ eventId: `$sent.${txnId}`, body: 'Hello from denser', sender: USER_ID }]);
    await expect(messages(page).filter({ hasText: 'Hello from denser' })).toBeVisible();
    await expect(panel(page).getByTestId('chat-outgoing')).toHaveCount(0);

    // Shift+Enter is a new line; Enter sends
    homeserver.failNextSends(1);
    await composer(page).press('Shift+Enter');
    await composer(page).pressSequentially('second');
    await composer(page).press('Enter');
    const outgoing = panel(page).getByTestId('chat-outgoing');
    await expect(outgoing).toHaveAttribute('data-status', 'failed');
    await expect(outgoing).toContainText(EN.send_failed);
    // Headed like a sent message, not run on under the one before it
    await expect(outgoing.getByTitle(USER_ID)).toHaveText(DEFAULT_USER.username);
    await expect(outgoing.locator('time')).toHaveText(/\d{2}:\d{2}/);
    await outgoing.getByRole('button', { name: EN.retry }).click();
    await expect(outgoing).toHaveAttribute('data-status', 'sent');
    const sends = homeserver.requestsWith('/send/m.room.message/', 'PUT').slice(1);
    expect(sends.map((request) => request.body)).toEqual([
      { msgtype: 'm.text', body: '\nsecond' },
      { msgtype: 'm.text', body: '\nsecond' }
    ]);
    expect(new Set(sends.map((request) => request.path)).size).toBe(1);
  });

  test('CHAT-NATIVE-13: days are headed, and times and days follow the blog language, not the browser', async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
    const { homeserver } = await usesNativeChat(page);
    await page.goto(PAGE_WITH_HEADER);
    const plChatButton = page.getByRole('button', { name: plBlog.chat_widget.open_widget });
    await expect(plChatButton).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
    await plChatButton.click();
    await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });

    // The room's messages are from 1970: one heading over them, with the year
    const days = panel(page).getByRole('separator');
    await expect(days).toHaveCount(1);
    await expect(days.first()).toContainText(/19(69|70)/);
    homeserver.queueMessages(GENERAL_ROOM, [{ eventId: '$today.1', body: 'Dzisiejsza wiadomość' }]);
    await expect(days).toHaveCount(2);
    await expect(days.last()).toHaveText('Dzisiaj');
    await expect(messages(page).last().locator('time')).toHaveText(/^\d{2}:\d{2}$/);
  });

  test('CHAT-NATIVE-03: older messages load scrolling back, and new ones arrive live', async ({ page }) => {
    const { homeserver } = await usesNativeChat(page);
    await openChat(page);

    await expect(messages(page).first()).toContainText(OLDER_GENERAL_MESSAGE);
    const [page1] = homeserver.requestsWith('/messages', 'GET');
    expect(page1.query.get('from')).toBe('general-history');
    expect(page1.query.get('dir')).toBe('b');
    await expect(panel(page).getByText(EN.history_start)).toBeVisible();

    homeserver.queueMessages(GENERAL_ROOM, [{ eventId: '$live.1', body: 'A live message' }]);
    await expect(messages(page).last()).toContainText('A live message');
  });

  test('CHAT-NATIVE-04: the chat button shows the unread count, which clears as rooms are read', async ({ page }) => {
    const { homeserver } = await usesNativeChat(page);
    await openPage(page);
    await chatButton(page).hover();

    await expect(badge(page)).toHaveText(new RegExp(`^${UNREAD.general + UNREAD.lobby}`), {
      timeout: SIGNED_IN_TIMEOUT_MS
    });
    expect(homeserver.requestsWith('/receipt/')).toEqual([]);

    await chatButton(page).click();
    await expect.poll(() => homeserver.requestsWith('/receipt/m.read/', 'POST').length).toBe(1);
    await expect(badge(page)).toHaveText(new RegExp(`^${UNREAD.lobby}`));

    await panel(page).getByRole('button', { name: /lobby/ }).click();
    await expect(messages(page).filter({ hasText: LOBBY_MESSAGE })).toBeVisible();
    await expect.poll(() => homeserver.requestsWith('/receipt/m.read/', 'POST').length).toBe(2);
    await expect(badge(page)).toHaveCount(0);
  });

  test('CHAT-NATIVE-05: signing out stops the client and signs its device out', async ({ page }) => {
    const { homeserver } = await usesNativeChat(page);
    await openChat(page);
    expect(await storedSession(page)).toMatchObject({ userId: USER_ID });
    await page.getByRole('button', { name: EN.close_widget }).click();
    const failed = recordFailedResponses(page);

    await signOut(page);

    await expect(chatButton(page)).toHaveCount(0);
    await expect.poll(() => homeserver.requestsTo('/logout', 'POST').length).toBe(1);
    expect(await storedSession(page)).toBeNull();
    const syncs = homeserver.requestsTo('/sync').length;
    await page.waitForTimeout(1_500);
    expect(homeserver.requestsTo('/sync').length).toBe(syncs);
    expect(failed).toEqual([]);
  });

  test("CHAT-NATIVE-17: a sign-out whose server deleted the user's devices sends no /logout of its own", async ({
    page
  }) => {
    const { homeserver } = await usesNativeChat(page);
    // As denser's server does with a Matrix admin token: it deletes the devices, then answers
    await page.route('**/api/auth/logout', async (route) => {
      const response = await route.fetch();
      homeserver.revokeSessions();
      await route.fulfill({ response, json: { ...(await response.json()), chatSessionsEnded: true } });
    });
    await openChat(page);
    await page.getByRole('button', { name: EN.close_widget }).click();
    const failed = recordFailedResponses(page);

    await signOut(page);

    await expect(chatButton(page)).toHaveCount(0);
    await expect.poll(() => storedSession(page)).toBeNull();
    const syncs = homeserver.requestsTo('/sync').length;
    await page.waitForTimeout(1_500);
    expect(homeserver.requestsTo('/sync').length).toBe(syncs);
    expect(homeserver.requestsTo('/logout')).toEqual([]);
    expect(failed).toEqual([]);
  });

  test('CHAT-NATIVE-06: MATRIX_CHAT_CLIENT=element keeps Element in an iframe, without the native client', async ({
    page
  }) => {
    const { homeserver } = await usesNativeChat(page, { ...NATIVE_SETTINGS, MATRIX_CHAT_CLIENT: 'element' });
    await page.route(`${ELEMENT}/**`, (route) => route.fulfill({ contentType: 'text/html', body: '<title>Element</title>' }));
    await openPage(page);
    await chatButton(page).click();

    await expect(page.locator('#chat-iframe')).toHaveAttribute('src', new RegExp(`^${ELEMENT}/denser-session.html`));
    await expect(panel(page)).toHaveCount(0);
    expect(homeserver.requestsTo('/login')).toEqual([]);
  });

  test('CHAT-NATIVE-07: the client is not in the JS a page loads up front', async ({ request }) => {
    expect(await findMarkersInInitialChunks(request, '/trending', [CHUNK_MARKERS.matrixSdk])).toEqual([]);
  });

  test('CHAT-NATIVE-08: the client loads in a chunk of its own, with no crypto wasm in what it loads', async ({
    page
  }) => {
    await usesNativeChat(page);
    const chunks: Array<Promise<{ url: string; code: string }>> = [];
    page.on('response', (response) => {
      if (/\/_next\/static\/chunks\/.+\.js/.test(response.url())) {
        chunks.push(response.text().then((code) => ({ url: response.url(), code: withoutChunkPaths(code) })));
      }
    });
    await openChat(page);

    const loaded = await Promise.all(chunks);
    expect(loaded.filter((chunk) => chunk.code.includes(CHUNK_MARKERS.matrixSdk))).toHaveLength(1);
    expect(loaded.filter((chunk) => chunk.code.includes('matrix_sdk_crypto_wasm')).map((chunk) => chunk.url)).toEqual([]);
  });

  test('CHAT-NATIVE-09: a reload and a second tab resume the stored session, with no second token or sign-in', async ({
    page
  }) => {
    const chat = await usesNativeChat(page);
    await openChat(page);
    const stored = await storedSession(page);

    await page.reload();
    await chatButton(page).click();
    await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });

    const secondTab = await page.context().newPage();
    await usesNativeChat(secondTab, NATIVE_SETTINGS, chat);
    await openChat(secondTab);

    expect(chat.loginTokenRequests).toHaveLength(1);
    expect(chat.homeserver.requestsTo('/login', 'POST')).toHaveLength(1);
    expect(chat.homeserver.requestsTo('/account/whoami', 'GET')).toHaveLength(2);
    expect(chat.homeserver.requestsTo('/logout')).toEqual([]);
    expect(await storedSession(secondTab)).toEqual(stored);
  });

  test('CHAT-NATIVE-10: a rate-limited token request is retried once after the wait the route names', async ({
    page
  }) => {
    const chat = await usesNativeChat(page);
    chat.rateLimited = 1;
    await openChat(page);

    expect(chat.loginTokenRequests).toHaveLength(2);
    expect(chat.homeserver.requestsTo('/login', 'POST')).toHaveLength(1);
    await expect(panel(page).getByText(EN.sign_in_failed)).toHaveCount(0);
  });

  test('CHAT-NATIVE-15: a session the homeserver signs out signs in again with a new token, once, without Try again', async ({
    page
  }) => {
    const chat = await usesNativeChat(page);
    await openChat(page);
    const signedOut = await storedSession(page);

    chat.homeserver.revokeSessions();

    await expect.poll(() => chat.homeserver.requestsTo('/login', 'POST').length, { timeout: SIGNED_IN_TIMEOUT_MS }).toBe(2);
    await expect(messages(page).filter({ hasText: GENERAL_MESSAGES[0] })).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });
    expect(chat.loginTokenRequests).toHaveLength(2);
    await expect(signInFailed(page)).toHaveCount(0);
    await expect.poll(() => storedSession(page)).toMatchObject({ userId: USER_ID, deviceId: signedOut.deviceId });
    expect((await storedSession(page)).accessToken).not.toBe(signedOut.accessToken);

    chat.homeserver.revokeSessions();

    await expect(signInFailed(page)).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });
    expect(chat.loginTokenRequests).toHaveLength(2);
  });

  test('CHAT-NATIVE-11: the SDK logs no console warning at the default log level', async ({ page }) => {
    // The stub's push rules have none of the defaults, of each of which the SDK warns
    const warnings: string[] = [];
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type()) && message.text().includes('Matrix chat')) {
        warnings.push(message.text());
      }
    });
    const { homeserver } = await usesNativeChat(page, { ...NATIVE_SETTINGS, LOGGING_BROWSER_ENABLED: 'true' });
    await openChat(page);
    await expect.poll(() => homeserver.requestsTo('/pushrules/').length).toBeGreaterThan(0);

    expect(warnings).toEqual([]);
  });

  test('CHAT-NATIVE-12: no MatrixRTC request leaves the page, and a reload with the drawer open logs no chat error', async ({
    page
  }) => {
    const rtcRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/rtc/transports')) rtcRequests.push(request.url());
    });
    const problems: string[] = [];
    page.on('console', (message) => {
      const fromChat = message.text().includes('Matrix chat') || message.location().url.startsWith(HOMESERVER);
      if (['warning', 'error'].includes(message.type()) && fromChat) problems.push(message.text());
    });
    const { homeserver } = await usesNativeChat(page, { ...NATIVE_SETTINGS, LOGGING_BROWSER_ENABLED: 'true' });
    await openChat(page);
    await expect.poll(() => homeserver.requestsTo('/sync').length).toBeGreaterThan(1);
    // As the browser does once the reload starts: the client's long poll fails in the old page
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) homeserver.cutOffLongPolls();
    });

    await page.reload();
    await chatButton(page).click();
    await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });
    await expect.poll(() => homeserver.requestsTo('/sync').length).toBeGreaterThan(3);

    expect(rtcRequests).toEqual([]);
    expect(homeserver.requestsWith('/rtc/')).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('CHAT-NATIVE-14: the keyboard reaches the drawer: focus moves in, Tab stays in, Escape closes it', async ({
    page
  }) => {
    await usesNativeChat(page);
    await openPage(page);

    await chatButton(page).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focusInDrawer(page)).toBe(true);
    await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });

    await page.keyboard.press('Escape');
    await expect(chatButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(composer(page)).toBeFocused();

    const openApp = page.getByRole('link', { name: EN.open_app });
    await openApp.focus();
    await page.keyboard.press('Tab');
    expect(await focusInDrawer(page)).toBe(true);
    await expect(openApp).not.toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(openApp).toBeFocused();
    for (let step = 0; step < 15; step++) {
      await page.keyboard.press('Tab');
      expect(await focusInDrawer(page)).toBe(true);
    }

    await composer(page).focus();
    await page.keyboard.press('Escape');
    await expect(chatButton(page)).toBeFocused();
  });

  test('CHAT-NATIVE-18: the chat button is the next Tab stop after the header, with a visible focus ring', async ({
    page
  }) => {
    await usesNativeChat(page);
    await openPage(page);

    await page.evaluate(() => {
      const headerStops = Array.from(
        document.querySelectorAll<HTMLElement>('header a[href], header button:not([disabled]), header input')
      ).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
      headerStops.at(-1)?.focus();
    });
    await page.keyboard.press('Tab');
    await expect(chatButton(page)).toBeFocused();
    await expect(chatButton(page)).not.toHaveCSS('box-shadow', 'none');

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true);
    await page.keyboard.press('Shift+Tab');
    await expect(chatButton(page)).toBeFocused();
  });

  test('CHAT-NATIVE-16: on the first Tab lap after sign-in, focus never drops out of the drawer', async ({ page }) => {
    // Short enough that #general's messages fill the timeline: "Load older" waits for a scroll
    await page.setViewportSize({ width: 1280, height: SHORT_VIEWPORT_PX });
    await usesNativeChat(page);
    await openPage(page);

    await chatButton(page).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => focusInDrawer(page)).toBe(true);
    await expect(panel(page).getByRole('button', { name: EN.load_older })).toBeVisible({
      timeout: SIGNED_IN_TIMEOUT_MS
    });

    const focused: string[] = [];
    for (let step = 0; step < MAX_LAP_STOPS; step++) {
      await page.keyboard.press('Tab');
      focused.push(await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80) ?? 'none'));
      expect(await focusInDrawer(page), focused.join('\n')).toBe(true);
      if (await composer(page).evaluate((element) => element === document.activeElement)) break;
    }
    await expect(composer(page)).toBeFocused();
    await expect(panel(page).getByText(OLDER_GENERAL_MESSAGE)).toBeVisible();
  });
});
