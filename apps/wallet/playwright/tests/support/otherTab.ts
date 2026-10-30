import { expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from './basePath';
import { STUB_ACCOUNT } from './walletApiStub';

const OTHER_TAB_PATH = `${WALLET_BASE_PATH}/__other-tab`;

/**
 * Another tab of `page`'s origin, which shares its localStorage and BroadcastChannel. It loads an
 * empty HTML page rather than a wallet page, whose app would act on what the spec stores; not an
 * image either, whose document's BroadcastChannel reaches no other tab.
 */
export const openOtherTab = async (page: Page): Promise<Page> => {
  const otherTab = await page.context().newPage();
  await otherTab.route(`**${OTHER_TAB_PATH}`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Other tab</title>' })
  );
  await otherTab.goto(OTHER_TAB_PATH);
  return otherTab;
};

/** Signs out in `otherTab`: it stores the logged-out user, which the origin's other tabs hear. */
export const signOutInTab = (otherTab: Page) =>
  otherTab.evaluate(() =>
    window.localStorage.setItem(
      'user',
      JSON.stringify({ isLoggedIn: false, username: '', avatarUrl: '', loginType: 'hbauth', keyType: 'posting' })
    )
  );

/**
 * Signs STUB_ACCOUNT in with its active key in `otherTab`: it stores the user, as a sign-in does, and
 * tells `page` on the `denser-accounts` channel (smart-signer's account-sync.ts) once `page` reads
 * that user: a tab's localStorage can follow another tab's write later than the channel's message.
 */
export const signInInTab = async (otherTab: Page, page: Page) => {
  await otherTab.evaluate((username) => {
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        isLoggedIn: true,
        username,
        avatarUrl: '',
        loginType: 'wif',
        keyType: 'active',
        authenticateOnBackend: false,
        chatAuthToken: '',
        oauthConsent: {},
        strict: false
      })
    );
  }, STUB_ACCOUNT);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('user') ?? '{}').isLoggedIn))
    .toBe(true);
  // Left open, as a tab's is: a channel closed at once may drop the message before it is delivered
  await otherTab.evaluate(() => new BroadcastChannel('denser-accounts').postMessage({ type: 'accounts-changed' }));
};
