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

test.use({
  fixtureTestName: 'accountSwitchLogout',
  bypassCSP: true,
  authenticatedUser: { strict: true, authenticateOnBackend: true, oauthConsent: { openhive_chat: true } }
});

const chatButton = (page: Page) => page.getByRole('button', { name: EN.open_widget });
const badge = (page: Page) => page.getByTestId('chat-unread-badge');
const panel = (page: Page) => page.getByTestId('matrix-chat-panel');
const messages = (page: Page) => panel(page).getByTestId('chat-message');
const composer = (page: Page) => panel(page).getByRole('textbox', { name: EN.composer_label });

async function usesNativeChat(page: Page, settings: Record<string, string> = NATIVE_SETTINGS) {
  await configureChat(page, settings);
  const homeserver = new MatrixHomeserverStub(USER_ID);
  await homeserver.install(page);
  const loginTokenRequests: Request[] = [];
  await page.route('**/api/chat/matrix-login-token', (route) => {
    loginTokenRequests.push(route.request());
    return route.fulfill({ json: { loginToken: LOGIN_TOKEN } });
  });
  return { homeserver, loginTokenRequests };
}

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

    // The same device again after a reload
    await page.reload();
    await chatButton(page).click();
    await expect(messages(page).first()).toBeVisible({ timeout: SIGNED_IN_TIMEOUT_MS });
    const logins = homeserver.requestsTo('/login', 'POST');
    expect(logins.map((request) => Reflect.get(Object(request.body), 'device_id'))).toEqual([deviceId, deviceId]);
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
    await outgoing.getByRole('button', { name: EN.retry }).click();
    await expect(outgoing).toHaveAttribute('data-status', 'sent');
    const sends = homeserver.requestsWith('/send/m.room.message/', 'PUT').slice(1);
    expect(sends.map((request) => request.body)).toEqual([
      { msgtype: 'm.text', body: '\nsecond' },
      { msgtype: 'm.text', body: '\nsecond' }
    ]);
    expect(new Set(sends.map((request) => request.path)).size).toBe(1);
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
    await page.getByRole('button', { name: EN.close_widget }).click();

    await new HomePage(page).profileAvatarButton.click();
    await new ProfileUserMenu(page).logoutLink.click();

    await expect(chatButton(page)).toHaveCount(0);
    await expect.poll(() => homeserver.requestsTo('/logout', 'POST').length).toBe(1);
    const syncs = homeserver.requestsTo('/sync').length;
    await page.waitForTimeout(1_500);
    expect(homeserver.requestsTo('/sync').length).toBe(syncs);
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
});
