import fs from 'fs';
import path from 'path';
import type { BrowserContext, Frame, Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { TIMEOUTS } from '../support/constants';
import { configureChat } from '../support/chatSettings';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * The chat widget of each chat provider, with Matrix's Element client (`MATRIX_CHAT_CLIENT=element`;
 * the native client is chatNative.spec.ts). The provider and its URLs are client settings: the
 * spec appends them to `__ENV.js`, and bypasses the fixture build's CSP, which frames neither
 * chat origin. Every chat origin is answered by `page.route`; nothing leaves the browser.
 *
 * Matrix: Element's origin serves the session page committed in stack/matrix/chat-origin, as
 * that stack's caddy does, with Element's `config.json`; the homeserver's SSO redirect stands in
 * for Synapse → denser → Synapse by sending the frame back to Element with a login token. denser's
 * login token route, which the session page asks for a token through the widget first, answers
 * that the user has no Matrix account yet, so the session page falls back to that SSO, unless a
 * test has it mint one. An init
 * script plays a session Element already holds (`mx_user_id`), and its device settings
 * (`mx_local_settings`), when the session page loads. denser's theme is the system's
 * (`defaultTheme="system"`), set through the emulated color scheme.
 *
 * Element's warm-up (`MATRIX_CHAT_PRELOAD`) loads the frame hidden in the closed drawer: on idle,
 * a few seconds after the page loads, or on intent to use the chat button. A check that it has
 * not loaded waits past the idle warm-up's latest start.
 *
 * Fixtures: reuses `accountSwitchLogout`, which loads the same page for a signed-in user.
 */

const PAGE_WITH_HEADER = '/faq.html';
const USERNAME = DEFAULT_USER.username;
const ELEMENT = 'https://chat.matrix.test';
const HOMESERVER = 'https://matrix.matrix.test';
const SERVER_NAME = 'matrix.matrix.test';
const IDP_ID = 'oidc-denser';
const SESSION_PAGE = `${ELEMENT}/denser-session.html`;
const SSO_REDIRECT = `${HOMESERVER}/_matrix/client/v3/login/sso/redirect/${IDP_ID}`;
const LOGIN_TOKEN_ROUTE = '**/api/chat/matrix-login-token';
const MINTED_LOGIN_TOKEN = 'syl_minted_login_token';
const FORGED_LOGIN_TOKEN = 'syl_forged_login_token';
const OTHER_ORIGIN = 'https://other.example.test';
/** Past the session page's wait for a login token answer (LOGIN_TOKEN_WAIT_MS) */
const PAST_LOGIN_TOKEN_WAIT_MS = 15_000;
/** Element's screen for the default room, `#general` of the server */
const DEFAULT_ROOM_SCREEN = `#/room/${encodeURIComponent(`#general:${SERVER_NAME}`)}`;
const ROCKET_CHAT = 'https://rocket.chat.test';
const OPENHIVE_CHAT = 'https://openhive.chat';
const SESSION_PAGE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', '..', '..', '..', 'stack', 'matrix', 'chat-origin', 'denser-session.html'),
  'utf-8'
);
const EN = enBlog;
const MATRIX_SETTINGS = {
  CHAT_PROVIDER: 'matrix',
  MATRIX_CHAT_CLIENT: 'element',
  OPENHIVE_CHAT_URI: OPENHIVE_CHAT,
  MATRIX_ELEMENT_URL: ELEMENT,
  MATRIX_HOMESERVER_URL: HOMESERVER
};
/** Past the idle warm-up's latest start after hydration: its 2 s delay and 3 s idle timeout */
const PAST_IDLE_WARM_UP_MS = 7_000;
const IDLE_WARM_UP_TIMEOUT_MS = 15_000;

test.use({
  fixtureTestName: 'accountSwitchLogout',
  bypassCSP: true,
  authenticatedUser: { strict: true, authenticateOnBackend: true, oauthConsent: { openhive_chat: true } }
});

/** Element's origin and the homeserver; resolves to the SSO redirects the frame was sent to. */
async function stubMatrix(page: Page): Promise<string[]> {
  const ssoRedirects: string[] = [];
  await page.route(LOGIN_TOKEN_ROUTE, (route) => route.fulfill({ status: 404, json: { error: 'No Matrix account yet' } }));
  await page.route(`${ELEMENT}/**`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/denser-session.html') {
      return route.fulfill({ contentType: 'text/html', body: SESSION_PAGE_SOURCE });
    }
    if (url.pathname === '/config.json') {
      return route.fulfill({
        json: { default_server_config: { 'm.homeserver': { base_url: `${HOMESERVER}/`, server_name: SERVER_NAME } } }
      });
    }
    return route.fulfill({ contentType: 'text/html', body: '<title>Element</title>' });
  });
  await page.route(`${HOMESERVER}/**`, (route) => {
    ssoRedirects.push(route.request().url());
    // As Synapse does: the login token joins redirectUrl's query, its fragment stays
    const back = new URL(new URL(route.request().url()).searchParams.get('redirectUrl') ?? `${ELEMENT}/`);
    back.searchParams.set('loginToken', 'login-token');
    // A fulfilled redirect does not navigate a frame: send it on from a page
    return route.fulfill({
      contentType: 'text/html',
      body: `<script>location.replace(${JSON.stringify(back.href)})</script>`
    });
  });
  return ssoRedirects;
}

/**
 * Element holds `userId`'s session when the session page loads, empty for none, with
 * `localSettings` as its device settings when given.
 */
async function elementHoldsSession(
  context: BrowserContext,
  userId: string,
  localSettings?: Record<string, unknown>
): Promise<void> {
  await context.addInitScript(
    ({ sessionPage, held, settings }) => {
      if (`${location.origin}${location.pathname}` !== sessionPage) return;
      localStorage.clear();
      if (held) localStorage.setItem('mx_user_id', held);
      if (settings) localStorage.setItem('mx_local_settings', JSON.stringify(settings));
    },
    { sessionPage: SESSION_PAGE, held: userId, settings: localSettings }
  );
}

function recordRequests(page: Page, ...origins: string[]): Request[] {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (origins.some((origin) => request.url().startsWith(origin))) requests.push(request);
  });
  return requests;
}

const chatButton = (page: Page) => page.getByRole('button', { name: EN.chat_widget.open_widget });
const chatIframe = (page: Page) => page.locator('#chat-iframe');
const closeButton = (page: Page) => page.getByRole('button', { name: EN.chat_widget.close_widget });

async function openPage(page: Page): Promise<void> {
  await page.goto(PAGE_WITH_HEADER);
  await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
}

async function openChat(page: Page): Promise<void> {
  await openPage(page);
  await chatButton(page).click();
}

async function signOut(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const profileMenu = new ProfileUserMenu(page);
  await homePage.profileAvatarButton.click();
  await profileMenu.logoutLink.click();
}

/** The first frame `matches` accepts, once there is one. */
async function waitForFrame(page: Page, matches: (url: string) => boolean): Promise<Frame> {
  await expect.poll(() => page.frames().some((frame) => matches(frame.url()))).toBe(true);
  const found = page.frames().find((frame) => matches(frame.url()));
  if (!found) throw new Error('the frame went away');
  return found;
}

/** Element, reached with a login token from the SSO */
const elementFrame = (page: Page) => waitForFrame(page, (url) => url.startsWith(`${ELEMENT}/?loginToken=`));

const readElementSettings = (frame: Frame): Promise<unknown> =>
  frame.evaluate(() => JSON.parse(localStorage.getItem('mx_local_settings') ?? 'null'));

const chatIframeTheme = async (page: Page) =>
  new URL((await chatIframe(page).getAttribute('src')) ?? '').searchParams.get('theme');

const readElementStorage = (frame: Frame) =>
  frame.evaluate(() => ({
    userId: localStorage.getItem('mx_user_id'),
    ssoHomeserver: localStorage.getItem('mx_sso_hs_url')
  }));

test.describe('Chat widget in Matrix mode', () => {
  let ssoRedirects: string[];
  let openhiveChatRequests: Request[];

  test.beforeEach(async ({ page }) => {
    await configureChat(page, MATRIX_SETTINGS);
    ssoRedirects = await stubMatrix(page);
    openhiveChatRequests = recordRequests(page, OPENHIVE_CHAT);
  });

  test('CHAT-MATRIX-01: the drawer signs in to Element through the SSO redirect of the configured IdP, into the default room', async ({
    page,
    context
  }) => {
    await elementHoldsSession(context, '');
    await openChat(page);

    const src = new URL((await chatIframe(page).getAttribute('src')) ?? '');
    expect(`${src.origin}${src.pathname}`).toBe(SESSION_PAGE);
    expect(src.searchParams.get('user')).toBe(`@${USERNAME}:${SERVER_NAME}`);
    expect(src.searchParams.get('idp')).toBe(IDP_ID);
    expect(src.searchParams.get('room')).toBe(`#general:${SERVER_NAME}`);
    const frame = await elementFrame(page);
    expect(ssoRedirects).toEqual([
      `${SSO_REDIRECT}?redirectUrl=${encodeURIComponent(`${ELEMENT}/${DEFAULT_ROOM_SCREEN}`)}`
    ]);
    expect(new URL(frame.url()).hash).toBe(DEFAULT_ROOM_SCREEN);
    // Element's token login reads the homeserver from there
    expect(await readElementStorage(frame)).toEqual({ userId: null, ssoHomeserver: HOMESERVER });
    expect(openhiveChatRequests.map((request) => request.url())).toEqual([]);
  });

  test("CHAT-MATRIX-02: another user's Element session is cleared before signing in", async ({ page, context }) => {
    await elementHoldsSession(context, `@previous-user:${SERVER_NAME}`);
    await openChat(page);

    const frame = await elementFrame(page);
    expect(ssoRedirects).toHaveLength(1);
    expect(await readElementStorage(frame)).toEqual({ userId: null, ssoHomeserver: HOMESERVER });
  });

  test("CHAT-MATRIX-03: the user's own Element session continues in the default room without signing in again", async ({
    page,
    context
  }) => {
    await elementHoldsSession(context, `@${USERNAME}:${SERVER_NAME}`);
    await openChat(page);

    await expect
      .poll(() => page.frames().map((frame) => frame.url()))
      .toContain(`${ELEMENT}/${DEFAULT_ROOM_SCREEN}`);
    expect(ssoRedirects).toEqual([]);
  });

  test("CHAT-MATRIX-04: signing out ends the browser's Element session", async ({ page, context }) => {
    await elementHoldsSession(context, `@${USERNAME}:${SERVER_NAME}`);
    await openChat(page);
    await closeButton(page).click();

    await signOut(page);

    await expect(chatButton(page)).toHaveCount(0);
    const sessionEnd = await waitForFrame(page, (url) => url === SESSION_PAGE);
    await expect.poll(() => sessionEnd.evaluate(() => document.getElementById('status')?.textContent)).not.toBe('…');
    expect(await readElementStorage(sessionEnd)).toEqual({ userId: null, ssoHomeserver: null });
    expect(ssoRedirects).toEqual([]);
  });

  test('CHAT-MATRIX-05: the sidebar chat link leads to Element', async ({ page }) => {
    const homePage = new HomePage(page);
    await page.goto(PAGE_WITH_HEADER);
    await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
    await homePage.getNavSidebarMenu.click();
    const link = homePage.getNavSidebarMenuContent.getByRole('link', { name: EN.chat_widget.chat });
    await expect(link).toHaveAttribute('href', ELEMENT);
  });

  test("CHAT-MATRIX-06: Element signs in with denser's resolved theme, dark or light", async ({ page, context }) => {
    await elementHoldsSession(context, '');
    await page.emulateMedia({ colorScheme: 'dark' });
    await openChat(page);

    expect(await chatIframeTheme(page)).toBe('dark');
    const frame = await elementFrame(page);
    expect(ssoRedirects).toHaveLength(1);
    // Set after clearing Element's storage, before the SSO
    expect(await readElementSettings(frame)).toEqual({ theme: 'dark', use_system_theme: false });

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
    await chatButton(page).click();
    expect(await chatIframeTheme(page)).toBe('light');
  });

  test("CHAT-MATRIX-07: changing denser's theme with the drawer open reloads Element in it, in the same session", async ({
    page,
    context
  }) => {
    const heldSettings = { layout: 'irc', theme: 'light', use_system_theme: true };
    await elementHoldsSession(context, `@${USERNAME}:${SERVER_NAME}`, heldSettings);
    const sessionPageRequests = recordRequests(page, SESSION_PAGE);
    await page.emulateMedia({ colorScheme: 'dark' });
    await openChat(page);
    const roomScreen = `${ELEMENT}/${DEFAULT_ROOM_SCREEN}`;
    const settingsInRoom = async () => {
      const frame = page.frames().find((candidate) => candidate.url() === roomScreen);
      return frame ? readElementSettings(frame).catch(() => null) : null;
    };
    await expect.poll(settingsInRoom).toEqual({ layout: 'irc', theme: 'dark', use_system_theme: false });

    await page.emulateMedia({ colorScheme: 'light' });

    await expect.poll(() => chatIframeTheme(page)).toBe('light');
    await expect
      .poll(() => sessionPageRequests.map((request) => new URL(request.url()).searchParams.get('theme')))
      .toEqual(['dark', 'light']);
    await expect.poll(settingsInRoom).toEqual({ layout: 'irc', theme: 'light', use_system_theme: false });
    expect(ssoRedirects).toEqual([]);
  });
});

test.describe('Chat widget in Matrix mode: sign-in with a login token from denser', () => {
  let ssoRedirects: string[];
  let loginTokenRequests: Request[];

  test.beforeEach(async ({ page, context }) => {
    await configureChat(page, MATRIX_SETTINGS);
    ssoRedirects = await stubMatrix(page);
    loginTokenRequests = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.endsWith('/api/chat/matrix-login-token')) loginTokenRequests.push(request);
    });
    await elementHoldsSession(context, `@previous-user:${SERVER_NAME}`);
  });

  test('CHAT-MATRIX-TOKEN-01: with a minted login token, Element signs in with it, without the SSO redirect', async ({
    page
  }) => {
    await page.route(LOGIN_TOKEN_ROUTE, (route) => route.fulfill({ json: { loginToken: MINTED_LOGIN_TOKEN } }));
    await openChat(page);

    const frame = await elementFrame(page);
    const url = new URL(frame.url());
    expect(url.searchParams.get('loginToken')).toBe(MINTED_LOGIN_TOKEN);
    expect(url.hash).toBe(DEFAULT_ROOM_SCREEN);
    expect(ssoRedirects).toEqual([]);
    expect(await readElementStorage(frame)).toEqual({ userId: null, ssoHomeserver: HOMESERVER });
    expect(loginTokenRequests.map((request) => request.method())).toEqual(['POST']);
    // The token never rides in the session page's address, which names denser's origin as its parent
    const src = new URL((await chatIframe(page).getAttribute('src')) ?? '');
    expect(src.href).not.toContain(MINTED_LOGIN_TOKEN);
    expect(src.searchParams.get('parent')).toBe(new URL(page.url()).origin);
  });

  test('CHAT-MATRIX-TOKEN-02: when denser mints no login token, the session page signs in through the SSO', async ({
    page
  }) => {
    await page.route(LOGIN_TOKEN_ROUTE, (route) => route.fulfill({ status: 503, json: { error: 'No login token' } }));
    await openChat(page);

    const frame = await elementFrame(page);
    expect(loginTokenRequests).toHaveLength(1);
    expect(ssoRedirects).toEqual([
      `${SSO_REDIRECT}?redirectUrl=${encodeURIComponent(`${ELEMENT}/${DEFAULT_ROOM_SCREEN}`)}`
    ]);
    expect(new URL(frame.url()).searchParams.get('loginToken')).toBe('login-token');
  });

  test("CHAT-MATRIX-TOKEN-03: the user's own Element session continues without asking for a login token", async ({
    page,
    context
  }) => {
    await elementHoldsSession(context, `@${USERNAME}:${SERVER_NAME}`);
    await openChat(page);

    await expect
      .poll(() => page.frames().map((frame) => frame.url()))
      .toContain(`${ELEMENT}/${DEFAULT_ROOM_SCREEN}`);
    expect(loginTokenRequests).toEqual([]);
    expect(ssoRedirects).toEqual([]);
  });
});

test.describe('Chat widget in Matrix mode: a login token answer from another origin', () => {
  let ssoRedirects: string[];

  test.beforeEach(async ({ page, context }) => {
    ssoRedirects = await stubMatrix(page);
    await elementHoldsSession(context, `@previous-user:${SERVER_NAME}`);
  });

  const cases = [
    { name: 'naming denser as the parent, with its own referrer', referrerPolicy: 'strict-origin-when-cross-origin' },
    { name: 'naming denser as the parent, with no referrer', referrerPolicy: 'no-referrer' }
  ];
  for (const [index, { name, referrerPolicy }] of cases.entries()) {
    test(`CHAT-MATRIX-TOKEN-0${index + 4}: is ignored from a page framing the session page ${name}, which signs in through the SSO`, async ({
      page,
      baseURL
    }) => {
      const sessionPage = new URL(SESSION_PAGE);
      sessionPage.searchParams.set('user', `@${USERNAME}:${SERVER_NAME}`);
      sessionPage.searchParams.set('idp', IDP_ID);
      sessionPage.searchParams.set('parent', new URL(baseURL ?? '').origin);
      // Answers a forged token, over and over, whether or not it is asked
      await page.route(`${OTHER_ORIGIN}/**`, (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: `<iframe id="session" referrerpolicy="${referrerPolicy}" src="${sessionPage.href}"></iframe>
<script>
  setInterval(() => document.getElementById('session').contentWindow.postMessage(
    { type: 'denser-matrix-login-token', loginToken: ${JSON.stringify(FORGED_LOGIN_TOKEN)} }, '*'), 50);
</script>`
        })
      );
      await page.goto(`${OTHER_ORIGIN}/`);

      await expect.poll(() => ssoRedirects, { timeout: PAST_LOGIN_TOKEN_WAIT_MS }).toHaveLength(1);
      const frame = await elementFrame(page);
      expect(new URL(frame.url()).searchParams.get('loginToken')).toBe('login-token');
      expect(page.frames().map((each) => each.url()).join(' ')).not.toContain(FORGED_LOGIN_TOKEN);
    });
  }
});

test.describe('Chat widget in Matrix mode: Element warm-up', () => {
  const ROOM_SCREEN = `${ELEMENT}/${DEFAULT_ROOM_SCREEN}`;
  let sessionPageRequests: Request[];

  const usesElement = async (page: Page, preload?: string) => {
    await configureChat(page, preload ? { ...MATRIX_SETTINGS, MATRIX_CHAT_PRELOAD: preload } : MATRIX_SETTINGS);
    await stubMatrix(page);
    sessionPageRequests = recordRequests(page, SESSION_PAGE);
  };

  /** No session page has been asked for once the idle warm-up would have started */
  const expectNoWarmUp = async (page: Page) => {
    await page.waitForTimeout(PAST_IDLE_WARM_UP_MS);
    expect(sessionPageRequests).toEqual([]);
    await expect(chatIframe(page)).toHaveCount(0);
  };

  const expectSessionPageRequests = (count: number) =>
    expect.poll(() => sessionPageRequests.length, { timeout: IDLE_WARM_UP_TIMEOUT_MS }).toBe(count);

  test.beforeEach(async ({ context }) => {
    // The user's own session, so the session page continues into the room without the SSO
    await elementHoldsSession(context, `@${USERNAME}:${SERVER_NAME}`);
  });

  test('CHAT-MATRIX-WARM-01: by default, Element loads hidden in the closed drawer once the page is idle', async ({
    page
  }) => {
    await usesElement(page);
    await openPage(page);

    await expectSessionPageRequests(1);
    expect(new URL(sessionPageRequests[0].url()).searchParams.get('user')).toBe(`@${USERNAME}:${SERVER_NAME}`);
    await waitForFrame(page, (url) => url === ROOM_SCREEN);
    const iframe = chatIframe(page);
    await expect(iframe).toHaveAttribute('aria-hidden', 'true');
    await expect(iframe).toHaveAttribute('tabindex', '-1');
    await expect(iframe).toHaveAttribute('inert', '');
    await expect(iframe).not.toBeInViewport();
    await expect(closeButton(page)).not.toBeInViewport();
  });

  for (const { name, preload, saveData } of [
    { name: 'with MATRIX_CHAT_PRELOAD=intent', preload: 'intent', saveData: false },
    { name: 'under Save-Data', preload: undefined, saveData: true }
  ]) {
    test(`CHAT-MATRIX-WARM-02: ${name}, Element loads on pointing at the chat button, not before`, async ({
      page,
      context
    }) => {
      if (saveData) {
        await context.addInitScript(() => {
          Object.defineProperty(Navigator.prototype, 'connection', { get: () => ({ saveData: true }) });
        });
      }
      await usesElement(page, preload);
      await openPage(page);
      await expectNoWarmUp(page);

      await chatButton(page).hover();

      await expectSessionPageRequests(1);
      await expect(chatIframe(page)).toHaveAttribute('aria-hidden', 'true');
      await expect(closeButton(page)).not.toBeInViewport();
    });
  }

  test('CHAT-MATRIX-WARM-03: with MATRIX_CHAT_PRELOAD=off, Element loads only on opening the drawer', async ({
    page
  }) => {
    await usesElement(page, 'off');
    await openPage(page);
    await chatButton(page).hover();
    await expectNoWarmUp(page);

    await chatButton(page).click();

    await expectSessionPageRequests(1);
    await waitForFrame(page, (url) => url === ROOM_SCREEN);
  });

  test('CHAT-MATRIX-WARM-04: opening the drawer shows the warmed-up frame without loading it again', async ({
    page
  }) => {
    await usesElement(page);
    await openPage(page);
    const warmed = await waitForFrame(page, (url) => url === ROOM_SCREEN);
    // A global of the document: gone with any reload of the frame
    await warmed.evaluate(() => Reflect.set(window, 'warmedUp', true));

    await chatButton(page).click();

    const iframe = chatIframe(page);
    await expect(iframe).toBeInViewport();
    await expect(iframe).not.toHaveAttribute('aria-hidden', 'true');
    await expect(iframe).not.toHaveAttribute('inert');
    await expect(iframe).not.toHaveAttribute('tabindex', '-1');
    const shown = await (await iframe.elementHandle())?.contentFrame();
    expect(await shown?.evaluate(() => Reflect.get(window, 'warmedUp'))).toBe(true);
    expect(shown?.url()).toBe(ROOM_SCREEN);
    expect(sessionPageRequests).toHaveLength(1);
  });

  test('CHAT-MATRIX-WARM-05: signing out drops the warmed-up frame and ends the Element session', async ({ page }) => {
    await usesElement(page);
    await openPage(page);
    await waitForFrame(page, (url) => url === ROOM_SCREEN);

    await signOut(page);

    await expect(chatButton(page)).toHaveCount(0);
    await expect(chatIframe(page)).toHaveCount(0);
    const sessionEnd = await waitForFrame(page, (url) => url === SESSION_PAGE);
    await expect.poll(() => sessionEnd.evaluate(() => document.getElementById('status')?.textContent)).not.toBe('…');
    expect(await readElementStorage(sessionEnd)).toEqual({ userId: null, ssoHomeserver: null });
    expect(sessionPageRequests.map((request) => request.url())).toEqual([expect.stringContaining('?user='), SESSION_PAGE]);
    expect(page.frames().some((frame) => frame.url() === ROOM_SCREEN)).toBe(false);
  });
});

test.describe('Chat widget in Rocket.Chat mode', () => {
  test('CHAT-RC-01: the drawer embeds Rocket.Chat as before, and nothing reaches Matrix', async ({ page }) => {
    await configureChat(page, {
      OPENHIVE_CHAT_URI: ROCKET_CHAT,
      MATRIX_ELEMENT_URL: ELEMENT,
      MATRIX_HOMESERVER_URL: HOMESERVER
    });
    await page.route(`${ROCKET_CHAT}/**`, (route) => route.fulfill({ contentType: 'text/html', body: '' }));
    const matrixRequests = recordRequests(page, ELEMENT, HOMESERVER);
    const homePage = new HomePage(page);

    await page.goto(PAGE_WITH_HEADER);
    await expect(chatButton(page)).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    // Rocket.Chat's iframe loads with the page, before the drawer opens
    await expect(chatIframe(page)).toHaveAttribute('src', `${ROCKET_CHAT}/channel/general?layout=embedded`);
    await homePage.getNavSidebarMenu.click();
    await expect(
      homePage.getNavSidebarMenuContent.getByRole('link', { name: EN.navigation.sidebar.openhive_chat })
    ).toHaveAttribute('href', ROCKET_CHAT);
    expect(matrixRequests).toEqual([]);
  });
});
