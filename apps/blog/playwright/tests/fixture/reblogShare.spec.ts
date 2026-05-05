import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectReblogOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  POST_AUTHOR,
  POST_PERMLINK,
  POST_SHARE_PATH,
  gotoPostLoggedIn,
  openSharePostDialog
} from '../support/reblogShareContext';

/**
 * §7 Reblog & Share — fresh state on the gtg post (guest4test has NOT yet
 * reblogged it). Covers:
 *   RBL-01:    reblog the post (TX-05 custom_json follow→reblog)
 *   SHARE-01:  copy direct URL from the share dialog
 *   SHARE-02:  copy markdown link from the share dialog
 *
 * SHARE-03..SHARE-08 (Twitter/Facebook/Reddit/LinkedIn/PeakD/Ecency) were
 * intentionally skipped — they only assert URL-construction formulas, ride
 * `window.open(...)` whose post-redirect URLs (login walls) drift away
 * from the formula we'd be checking, and have priority P3 ("nice to have")
 * per the test plan. We don't post on those platforms, so the regression
 * window is too narrow to justify the brittleness.
 *
 * RBL-02 (already-reblogged indicator) lives in reblogStatusReblogged.spec
 * — needs a separate fixtureTestName (overlay variant), which a single
 * worker-scoped value can't reach from this spec.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog exec playwright test \
 *          --config=playwright.fixture.config.ts reblogShare.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- reblogShare.spec
 */

test.use({
  fixtureTestName: 'reblogShare',
  authenticatedUser: {}
});

// Pinned at record time. The post-detail SSR renders the article title from
// `bridge.get_post`, so this stays stable across replays. Update if the
// fixture is re-recorded against a different post.
const POST_TITLE = 'Hive HardFork 25 Jump Starter Kit';

test.describe('Reblog & Share — fresh state (§7)', () => {
  // ── RBL-01: reblog the post ─────────────────────────────────────────

  test('RBL-01: reblog post produces TX-05 custom_json (id=follow)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);

    await postPage.footerReblogIcon.click();
    await expect(postPage.reblogDialogHeader).toBeVisible();
    await expect(postPage.reblogDialogOkBtn).toBeEnabled();
    await postPage.reblogDialogOkBtn.click();

    await broadcast.waitForCount(1);
    expectReblogOperation(broadcast.calls[0], {
      account: VOTER,
      author: POST_AUTHOR,
      permlink: POST_PERMLINK
    });

    // Dialog closes via setOpen(false) inside the AlertDialogAction onClick
    // handler — synchronous and independent of the mutation outcome, so a
    // reliable post-submit UI signal.
    await expect(postPage.reblogDialogHeader).toBeHidden();

    // We deliberately do NOT assert on "Reblog successful" toast or the
    // post-success icon flip: useReblogMutation puts both behind onSuccess /
    // onSettled, which run only when transactionService.reblog resolves
    // cleanly. Our broadcast interceptor returns a canned `null` to short-
    // circuit the chain (see fixture-auth/broadcast-interceptor.ts), and
    // wax treats that as an error path — so the optimistic UI never fires
    // here. The captured broadcast above (TX-05 verification) is the
    // authoritative success signal for this test.
  });

  // ── SHARE-01 / SHARE-02: clipboard copy ─────────────────────────────

  test.describe('Share dialog — clipboard copy', () => {
    test.use({
      // ClipboardCopy uses navigator.clipboard.writeText, which Chromium
      // gates on the `clipboard-write` permission. Read-back also needs
      // `clipboard-read` for the assertion. Granted only in this group so
      // the rest of the file stays default-permission.
      permissions: ['clipboard-read', 'clipboard-write']
    });

    test('SHARE-01: Copy URL puts the absolute post URL on the clipboard', async ({ page }) => {
      await gotoPostLoggedIn(page);
      await openSharePostDialog(page);

      // Source of truth = the read-only Input the dialog renders. Reading
      // it lets the test ride out env-config differences between local and
      // CI (REACT_APP_BLOG_DOMAIN may be set to blog.openhive.network in
      // .env.local, but CI falls back to the public-vars default).
      const urlInput = page.getByTestId('share-dialog-copy-url-input');
      const displayed = await urlInput.inputValue();
      // Sanity: the URL has to identify our post — guards against the
      // dialog rendering some unrelated path even if the env-config flips.
      expect(displayed).toContain(POST_SHARE_PATH);

      await page.getByTestId('share-dialog-copy-url-button').click();
      // The button text flips to "Copied!" for 1.5s — proves the success
      // path ran (translation literal in en/common_blog.json).
      await expect(page.getByTestId('share-dialog-copy-url-button')).toHaveText('Copied!');

      const clipped = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipped).toBe(displayed);
    });

    test('SHARE-02: Copy markdown puts a [title](url) snippet on the clipboard', async ({
      page
    }) => {
      await gotoPostLoggedIn(page);
      await openSharePostDialog(page);

      const mdInput = page.getByTestId('share-dialog-copy-markdown-input');
      const displayed = await mdInput.inputValue();
      // Markdown form: `[<title>](<url>)` — verify both halves so a
      // future regression that drops the title or breaks the url-formula
      // surfaces here.
      expect(displayed).toMatch(/^\[.+\]\(.+\)$/);
      expect(displayed).toContain(POST_TITLE);
      expect(displayed).toContain(POST_SHARE_PATH);

      await page.getByTestId('share-dialog-copy-markdown-button').click();
      await expect(
        page.getByTestId('share-dialog-copy-markdown-button')
      ).toHaveText('Copied!');

      const clipped = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipped).toBe(displayed);
    });
  });
});
