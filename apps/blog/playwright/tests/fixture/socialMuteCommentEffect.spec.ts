import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { TIMEOUTS } from '../support/constants';

/**
 * §9.2 Mute cross-page propagation — MUTE-PROP-01.
 *
 * Muting a comment author via the user popover on a post-detail page
 * collapses their comment in-place. Mechanism — `useMuteMutation.onMutate`
 * prepends the target to `['muted', currentUser]` (use-mute-mutations.ts:22-32)
 * before the broadcast even fires, which immediately flips
 * `isMutedByViewer = true` in comment-list-item.tsx:80. The component
 * switches into its `isOriginallyHidden` branch
 * (comment-list-item.tsx:297), replacing the body with an
 * AccordionTrigger showing "Reveal Comment (muted by you)".
 *
 * No page reload required: the popover lives on the same page, the
 * mutation runs against the live QueryClient, the comment subscribes
 * to the same cache key, and React Query notifies subscribers on
 * setQueryData.
 *
 * Pinned post + commenter: `/@hiveio/hive-at-blockchain-rio` has 8
 * top-level (depth=1) replies; `steevc` is one of them ("Have fun
 * spreading the word about Hive."). We mute steevc rather than hiveio
 * because hiveio's only reply on this post sits at depth=3 inside a
 * nested thread and isn't rendered without expanding the parent —
 * which complicates the locator without changing what the test
 * proves. Re-record if the post is removed or steevc's top-level
 * comment is pruned.
 */

const MUTE_COMMENT_POST = '/@hiveio/hive-at-blockchain-rio';
const MUTE_COMMENT_TARGET = 'steevc';

test.use({
  fixtureTestName: 'socialMuteCommentEffect',
  authenticatedUser: {}
});

test('MUTE-PROP-01 — Muting a comment author collapses their comment in-place', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await page.goto(MUTE_COMMENT_POST);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });

  // Locate steevc's comment — the comment-list-item whose
  // author-name-link button contains the target's username inside the
  // header `<button>`. The button text concatenates name + reputation
  // ("steevc(75)"), so we match on the inner `<span>` that holds just
  // the name to keep the locator immune to reputation drift on
  // re-record.
  const targetComment = page
    .getByTestId('comment-list-item')
    .filter({
      has: page
        .getByTestId('author-name-link')
        .locator('span', { hasText: new RegExp(`^${MUTE_COMMENT_TARGET}$`) })
    })
    .first();
  await expect(targetComment).toBeVisible();
  // Baseline: body visible (no Reveal Comment trigger yet).
  await expect(targetComment.getByText('Reveal Comment')).toHaveCount(0);

  // Open the popover from the author's name and click MuteButton inside.
  await targetComment.getByTestId('author-name-link').first().click();
  const popover = page.getByTestId('user-popover-card-content');
  await expect(popover).toBeVisible();
  await popover.getByTestId('profile-mute-button').click();
  await broadcast.waitForCount(1);

  // Comment collapses immediately on optimistic cache update.
  await expect(targetComment.getByText('Reveal Comment')).toBeVisible();
  await expect(targetComment.getByText('(muted by you)')).toBeVisible();
});
