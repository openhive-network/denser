import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';
import { gotoPostLoggedIn } from '../support/reblogShareContext';

/**
 * §7 RBL-02 — reblog status indicator after the user has already reblogged
 * the post.
 *
 * Pre-state is staged via the `reblogShare_alreadyReblogged` overlay
 * variant (generate-voted-variants.mjs `priorReblog: true`), which patches
 * `condenser_api.get_reblogged_by` so the seeded user appears in the
 * rebloggers list. `useRebloggedByQuery` then returns true on initial
 * render and both ReblogTrigger instances mount in the "already reblogged"
 * branch.
 *
 * Worker-scoped `fixtureTestName` is the reason this is a separate spec
 * file from reblogShare.spec — Playwright's fixture system can't switch
 * the proxy dir per `test.describe` within one file.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- reblogStatusReblogged
 *
 * Regenerate the overlay (after re-recording reblogShare):
 *   node apps/blog/playwright/tests/support/fixture-auth/generate-voted-variants.mjs
 */

test.use({
  fixtureTestName: 'reblogShare_alreadyReblogged',
  authenticatedUser: {}
});

test.describe('Reblog status — already reblogged (§7 RBL-02)', () => {
  test('RBL-02: footer reblog icon renders red with the "You reblogged" tooltip', async ({
    page
  }) => {
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);

    // The "already reblogged" branch sets `cursor-default text-destructive`
    // on the icon — and ReblogTrigger.tsx wraps the icon in a TooltipTrigger
    // whose `disabled={isReblogged}` propagates to the SVG. So the icon is
    // both visually red AND non-clickable in this state. The reblog dialog
    // is unreachable from this UI branch (the `already_reblogged` dialog
    // copy only fires if the user reaches the dialog through a separate
    // path — e.g. parent doesn't pre-share `isReblogged` and the dialog's
    // own lazy query flips mid-open). For RBL-02 the test plan only asks
    // to "verify reblog indicator" — that's what the colored icon plus
    // tooltip prove.
    await expect(postPage.footerReblogIcon).toHaveClass(/text-destructive/);
    await expect(postPage.footerReblogIcon).toHaveClass(/cursor-default/);

    // The tooltip text ("You reblogged") is the textual indicator that
    // accompanies the colored icon. The TooltipTrigger reveals it on
    // hover/focus even while click is disabled.
    await postPage.footerReblogIcon.hover();
    // Radix Tooltip renders the text twice (visible + aria-live duplicate),
    // so the tooltip element's textContent is "You rebloggedYou reblogged".
    // toContainText avoids the strict-mode mismatch.
    await expect(postPage.footerReblogTooltip).toContainText('You reblogged');
  });
});
