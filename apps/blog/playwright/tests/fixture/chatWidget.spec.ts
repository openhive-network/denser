import fs from 'fs';
import path from 'path';
import type { BrowserContext, Frame, Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';
import { TIMEOUTS } from '../support/constants';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * The chat widget of each chat provider. The provider and its URLs are client settings: the
 * spec appends them to `__ENV.js`, and bypasses the fixture build's CSP, which frames neither
 * chat origin. Every chat origin is answered by `page.route`; nothing leaves the browser.
 *
 * Matrix: Element's origin serves the session page committed in stack/matrix/chat-origin, as
 * that stack's caddy does, with Element's `config.json`; the homeserver's SSO redirect stands in
 * for Synapse → denser → Synapse by sending the frame back to Element with a login token. An init
 * script plays a session Element already holds (`mx_user_id`) when the session page loads.
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
/** Element's screen for the default room, `#general` of the server */
const DEFAULT_ROOM_SCREEN = `#/room/${encodeURIComponent(`#general:${SERVER_NAME}`)}`;
const ROCKET_CHAT = 'https://rocket.chat.test';
const OPENHIVE_CHAT = 'https://openhive.chat';
const SESSION_PAGE_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', '..', '..', '..', '..', 'stack', 'matrix', 'chat-origin', 'denser-session.html'),
  'utf-8'
);
const EN = enBlog;

test.use({
  fixtureTestName: 'accountSwitchLogout',
  bypassCSP: true,
  authenticatedUser: { strict: true, authenticateOnBackend: true, oauthConsent: { openhive_chat: true } }
});

async function configureChat(page: Page, settings: Record<string, string>): Promise<void> {
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const assignments = Object.entries(settings)
      .map(([key, value]) => `window.__ENV.REACT_APP_${key} = ${JSON.stringify(value)};`)
      .join('\n');
    await route.fulfill({ response, body: `${await response.text()}\n${assignments}` });
  });
}

/** Element's origin and the homeserver; resolves to the SSO redirects the frame was sent to. */
async function stubMatrix(page: Page): Promise<string[]> {
  const ssoRedirects: string[] = [];
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

/** Element holds `userId`'s session when the session page loads; empty for none. */
async function elementHoldsSession(context: BrowserContext, userId: string): Promise<void> {
  await context.addInitScript(
    ({ sessionPage, held }) => {
      if (`${location.origin}${location.pathname}` !== sessionPage) return;
      localStorage.clear();
      if (held) localStorage.setItem('mx_user_id', held);
    },
    { sessionPage: SESSION_PAGE, held: userId }
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

async function openChat(page: Page): Promise<void> {
  await page.goto(PAGE_WITH_HEADER);
  await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
  await chatButton(page).click();
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

const readElementStorage = (frame: Frame) =>
  frame.evaluate(() => ({
    userId: localStorage.getItem('mx_user_id'),
    ssoHomeserver: localStorage.getItem('mx_sso_hs_url')
  }));

test.describe('Chat widget in Matrix mode', () => {
  let ssoRedirects: string[];
  let openhiveChatRequests: Request[];

  test.beforeEach(async ({ page }) => {
    await configureChat(page, {
      CHAT_PROVIDER: 'matrix',
      OPENHIVE_CHAT_URI: OPENHIVE_CHAT,
      MATRIX_ELEMENT_URL: ELEMENT,
      MATRIX_HOMESERVER_URL: HOMESERVER
    });
    ssoRedirects = await stubMatrix(page);
    openhiveChatRequests = recordRequests(page, OPENHIVE_CHAT);
  });

  test('CHAT-MATRIX-01: the drawer signs in to Element through the SSO redirect of the configured IdP, into the default room', async ({
    page,
    context
  }) => {
    await elementHoldsSession(context, '');
    await page.goto(PAGE_WITH_HEADER);
    await expect(chatButton(page)).toBeEnabled({ timeout: TIMEOUTS.HYDRATION });
    // Element loads with the first opening of the drawer
    await expect(chatIframe(page)).toHaveCount(0);

    await chatButton(page).click();

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
    await page.getByRole('button', { name: EN.chat_widget.close_widget }).click();

    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    await homePage.profileAvatarButton.click();
    await profileMenu.logoutLink.click();

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
