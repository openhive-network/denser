import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import {
  POST_AUTHOR,
  POST_PERMLINK,
  VOTER,
  gotoPostLoggedIn,
  postReplyTrigger,
  typeIntoReplyEditor
} from '../support/commentingContext';

/**
 * Comment draft recovery (§5 CMT-07).
 *
 * `reply-textbox.tsx` persists the in-progress reply body to
 * localStorage (key `replyTo-/<post_author>/<post_permlink>-<user>`)
 * via `useStorageWithTTL` with a 500ms debounce. On hydration the
 * stored draft is read back into the editor.
 *
 * Pure client-side test — no broadcast.
 */

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

test.describe('Comment draft recovery (§5)', () => {
  test('CMT-07: typed reply persists across reload', async ({ page }) => {
    const draftBody = 'CMT-07 in-progress draft to be recovered';
    const storageKey = `replyTo-/${POST_AUTHOR}/${POST_PERMLINK}-${VOTER}`;

    // No broadcast assertions in this test, but installing the
    // interceptor wires up `page.route` for localhost:8200; skipping it
    // alters Playwright's request routing and (in headed Chromium)
    // reliably stalls the dynamic CodeMirror chunk fetch — symptom is
    // that `.cm-content` never mounts after clicking the reply trigger.
    await installBroadcastInterceptor(page);

    await gotoPostLoggedIn(page);
    await postReplyTrigger(page).click();
    await typeIntoReplyEditor(page, draftBody);

    // Wait for the 500ms debounce in `saveToStorage`. Poll instead of a
    // fixed sleep so the test isn't fragile to slower runners.
    await page.waitForFunction(
      ({ key, expected }) => {
        const raw = window.localStorage.getItem(key);
        if (!raw) return false;
        try {
          const wrapped = JSON.parse(raw);
          // useStorageWithTTL wraps the value with metadata; the body
          // is in `.value` (or the raw string for legacy entries).
          const value =
            typeof wrapped === 'object' && wrapped !== null && 'value' in wrapped
              ? wrapped.value
              : wrapped;
          return value === expected;
        } catch {
          return raw === expected;
        }
      },
      { key: storageKey, expected: draftBody },
      { timeout: 5000 }
    );

    // Reload — localStorage survives, in-memory editor state doesn't.
    // The editor's open/closed state lives in `replybox-/...` (UI_STATE,
    // 30-day TTL), so on hydration the reply-editor auto-reopens
    // without another trigger click. The draft body in `replyTo-/...`
    // (DRAFT, 30-day TTL) is then read by useStorageWithTTL and
    // applied to the CodeMirror surface.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('login-btn')).toBeHidden();

    const cm = page.getByTestId('reply-editor').locator('.cm-content').first();
    await expect(cm).toContainText(draftBody, { timeout: 10000 });
  });
});
