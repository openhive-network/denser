import type { Page } from '@playwright/test';
import { KeyType } from '@smart-signer/types/common';
import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { FOLLOWER, gotoProfileLoggedIn } from '../support/followMuteContext';
import { DEFAULT_USER } from '../support/fixture-auth/seeder';

/**
 * A broadcast the node rejects for a missing authority (`tx_missing_active_auth`) shows a message
 * naming the key it needs, in the UI language, and none of the node's answer. Reuses MUTE-01's
 * recording (`socialMute`) and flow; the broadcast is answered with hived's rejection instead of
 * the canned success, so WorkerBee never polls for a block. A WIF session that holds only
 * another key than the operation needs gets the same message before anything is broadcast.
 */

const FIXTURE_PROXY_PORT = 8200;

/** hived's rejection of a transaction signed without the active authority, trimmed of its stack. */
const MISSING_ACTIVE_AUTH_ERROR = {
  code: -32003,
  message: `missing required active authority:Missing Active Authority ${FOLLOWER}`,
  data: { code: 3010000, name: 'tx_missing_active_auth', message: 'missing required active authority' }
};

const POSTING_KEY_MESSAGE = 'This operation needs your posting key. Sign in with it and try again.';

const MESSAGES = [
  { locale: 'en', message: 'This operation needs your active key. Sign in with your active key and try again.' },
  {
    locale: 'pl',
    message: 'Ta operacja wymaga klucza aktywnego (active). Zaloguj się kluczem aktywnym i spróbuj ponownie.'
  }
];

test.use({
  fixtureTestName: 'socialMute',
  authenticatedUser: {}
});

/** Answers `verify_authority` as valid and every broadcast with `error`; returns the broadcast count. */
async function rejectBroadcasts(page: Page, error: unknown): Promise<{ count: number }> {
  const broadcasts = { count: 0 };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      let body: { method?: unknown; id?: unknown } | null;
      try {
        body = request.postDataJSON();
      } catch {
        return route.continue();
      }
      const method = typeof body?.method === 'string' ? body.method : '';
      const id = typeof body?.id === 'number' || typeof body?.id === 'string' ? body.id : 1;
      if (method === 'database_api.verify_authority') {
        return route.fulfill({ json: { jsonrpc: '2.0', id, result: { valid: true } } });
      }
      if (/broadcast_transaction(_synchronous)?$/.test(method)) {
        broadcasts.count++;
        return route.fulfill({ json: { jsonrpc: '2.0', id, error } });
      }
      return route.continue();
    }
  );
  return broadcasts;
}

for (const { locale, message } of MESSAGES) {
  test(`AUTH-ERR-01-${locale} — a missing-authority rejection reads as the key it needs`, async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL ?? '' }]);
    const broadcasts = await rejectBroadcasts(page, MISSING_ACTIVE_AUTH_ERROR);
    await gotoProfileLoggedIn(page);
    const profile = new ProfilePage(page);

    await profile.muteButton.click();

    await expect(page.getByTestId('missing-authority-message')).toHaveText(message);
    expect(broadcasts.count).toBeGreaterThan(0);
    await expect(page.getByText('tx_missing_active_auth')).toHaveCount(0);
    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
  });
}

test.describe('A WIF session holding only the active key', () => {
  test.use({ authenticatedUser: { keyType: KeyType.active } });

  test('AUTH-ERR-02 — a posting operation is refused before broadcast, naming the posting key', async ({ page }) => {
    // The seeder stores a posting WIF, with which the session would sign; this one holds no posting key
    await page
      .context()
      .addInitScript((key) => window.localStorage.removeItem(key), `wif.${DEFAULT_USER.username}@posting`);
    const broadcasts = await rejectBroadcasts(page, MISSING_ACTIVE_AUTH_ERROR);
    await gotoProfileLoggedIn(page);

    await new ProfilePage(page).muteButton.click();

    await expect(page.getByTestId('missing-authority-message')).toHaveText(POSTING_KEY_MESSAGE);
    expect(broadcasts.count).toBe(0);
    await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
  });
});
