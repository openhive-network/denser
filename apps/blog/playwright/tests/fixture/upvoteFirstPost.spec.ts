import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';

/**
 * Upvote-on-first-post fixture test.
 *
 * The seeded user also gets a posting WIF in localStorage (from
 * CI_TEST_USER_WIF_POSTING), so the in-browser signer can produce a
 * syntactically valid signed transaction without popping the password
 * dialog. The resulting broadcast RPC never reaches the chain — a
 * Playwright-level interceptor returns a canned success, so the UI
 * commits the optimistic upvote and the toast fires.
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record -- upvoteFirstPost
 * Replay:  pnpm --filter @hive/blog test:fixture -- upvoteFirstPost
 */

test.use({
  fixtureTestName: 'upvoteFirstPost',
  authenticatedUser: {}
});

test.describe('Upvote — seeded logged-in user', () => {
  test('clicks upvote on first post card and sees broadcast + success UI', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);

    // Surface browser-side errors in the test log. The vote mutation can
    // swallow signer/broadcast errors into `handleError` with no visible
    // UI change — this makes silent failures debuggable.
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[browser:${msg.type()}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      console.log(`[browser:pageerror] ${err.message}\n${err.stack ?? ''}`);
    });
    // Every outgoing request from the browser — shows whether the vote click
    // triggered ANY network activity, and where it went.
    page.on('request', (req) => {
      if (req.method() !== 'GET') {
        console.log(`[req] ${req.method()} ${req.url()}`);
      }
    });
    page.on('requestfailed', (req) => {
      console.log(
        `[req:failed] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`
      );
    });
    // If signing falls back to the password dialog, it shows as a native
    // browser modal OR an in-page Dialog. Catch both.
    page.on('dialog', (dlg) => {
      console.log(`[dialog] ${dlg.type()}: ${dlg.message()}`);
      dlg.dismiss().catch(() => undefined);
    });

    await page.goto('/trending');

    // App Router hydration guard (useUserCore with isMounted) briefly flips
    // user.isLoggedIn to false between SSR and mount, which re-renders the
    // upvote button into its anonymous DialogLogin-wrapped form. Clicking
    // during that window opens a login dialog instead of voting. Waiting
    // for the nav's login-btn to disappear proves hydration has settled
    // into the logged-in state, so every post card is also in its
    // logged-in branch.
    await expect(page.getByTestId('login-btn')).toBeHidden();

    // The logged-in branch of votes-component renders a <button> inside
    // the TooltipContainer tagged upvote-button; the anonymous branch only
    // has an <svg>. Scoping to upvote-button >> button picks the clickable
    // logged-in variant deterministically.
    const firstUpvoteButton = page
      .getByTestId('upvote-button')
      .locator('button')
      .first();
    await expect(firstUpvoteButton).toBeVisible();

    // Dump a short snapshot of the DOM around the first upvote so we know
    // which branch we're actually clicking (slider / direct / DialogLogin).
    const debugHtml = await firstUpvoteButton
      .evaluate((el) => el.outerHTML)
      .catch(() => '<unavailable>');
    console.log(`[upvote-button outerHTML] ${debugHtml.slice(0, 300)}`);

    await firstUpvoteButton.click();

    // Accounts with >1M vests get a slider popover instead of an immediate
    // broadcast. If it opens, submit at whatever value the slider holds.
    const sliderSubmit = page.getByTestId('upvote-button-slider');
    const sliderAppeared = await sliderSubmit
      .waitFor({ state: 'visible', timeout: 1500 })
      .then(() => true)
      .catch(() => false);
    console.log(`[slider appeared] ${sliderAppeared}`);
    if (sliderAppeared) {
      await sliderSubmit.click();
    }

    // Dialog-login modal has its own testid; if it showed up, the click
    // landed on the anon branch.
    const loginDialogVisible = await page
      .locator('[role="dialog"]')
      .isVisible()
      .catch(() => false);
    console.log(`[login dialog visible after click] ${loginDialogVisible}`);

    // The interceptor caught exactly one broadcast_transaction POST.
    await broadcast.waitForCount(1);
    expect(broadcast.calls[0].method).toContain('broadcast_transaction');

    // Success toast fires from use-vote-mutation onSuccess.
    await expect(page.getByText('Vote successful')).toBeVisible();
    await expect(
      page.getByText('You have successfully upvoted.')
    ).toBeVisible();
  });
});
