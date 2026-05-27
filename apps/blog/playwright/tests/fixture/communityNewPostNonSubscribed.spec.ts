import { test, expect } from '../support/fixture-proxy-test';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  COMMUNITY_TAG,
  COMMUNITY_NAME,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-07 — Non-subscribed user can still open the editor from a community page.
 *
 * Negative-precondition smoke: verifies that the New Post button is NOT
 * gated by community subscription. The community-page sidebar in
 * `features/layouts/community/new-post-button.tsx` renders the link
 * unconditionally for any logged-in user, and the editor accepts any
 * `category` parameter regardless of subscription state — so a
 * non-subscribed user clicking through lands in the same editor as a
 * subscribed user (COM-06), with the community pre-filled in "Posting to".
 *
 * If product later decides to gate non-subscribed posting (subscribe
 * dialog interstitial, etc.), this spec will fail loudly — that's the
 * regression target.
 *
 * Recorded against hive-194913 (Photography Lovers) where guest4test is
 * NOT subscribed, so the community-subscribe-button on the sidebar proves
 * the non-subscribed precondition.
 */

test.use({
  fixtureTestName: 'communityNewPostNonSubscribed',
  authenticatedUser: {}
});

test('COM-07 — Non-subscribed user opens editor from community new-post button', async ({ page }) => {
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG);

  const community = new CommunitiesPage(page);
  // Non-subscribed precondition — subscribe-community.tsx renders the
  // blue subscribe button when context.subscribed: false.
  await expect(community.communitySubscribeButton).toBeVisible();
  // New Post button is rendered regardless of subscription state.
  await expect(community.communityNewPostButton).toBeVisible();

  await community.communityNewPostButton.click();
  await page.waitForURL(
    new RegExp(`/submit\\.html\\?category=${COMMUNITY_TAG}`)
  );

  const editor = new PostEditorPage(page);
  await expect(editor.getPostingToListTrigger).toBeVisible();
  await expect(editor.getPostingToListTrigger).toContainText(COMMUNITY_NAME);
});
