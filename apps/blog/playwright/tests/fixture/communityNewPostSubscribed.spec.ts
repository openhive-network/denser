import { test, expect } from '../support/fixture-proxy-test';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import { PostEditorPage } from '../support/pages/postEditorPage';
import {
  COMMUNITY_TAG_SUBSCRIBED,
  COMMUNITY_NAME_SUBSCRIBED,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-06 — Subscribed user can launch the editor from a community page.
 *
 * POST-03 (postCreateInCommunity.spec.ts) already covers the post-publish
 * wire form (`comment_operation` with `parent_permlink === community`).
 * COM-06's unique angle is the "subscribed user" precondition and the
 * community-page → editor handoff: the New Post button is visible because
 * the viewer is subscribed (community-join-leave-button shown), clicking
 * it navigates to `/submit.html?category=<community>`, and the editor
 * pre-selects that community in the "Posting to" dropdown so the user
 * doesn't have to re-pick it.
 *
 * No broadcast assertion — this is a navigation + initial-state smoke.
 * The publish path is exercised by POST-03; duplicating it here would
 * record ~30 extra fixture files for zero new wire-form coverage.
 */

test.use({
  fixtureTestName: 'communityNewPostSubscribed',
  authenticatedUser: {}
});

test('COM-06 — Subscribed user opens editor from community new-post button', async ({ page }) => {
  await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

  const community = new CommunitiesPage(page);
  // Subscribed precondition — the join/leave button only renders for
  // context.subscribed: true (subscribe-community.tsx:57).
  await expect(community.communityJoinedLeaveButton).toBeVisible();
  await expect(community.communityNewPostButton).toBeVisible();

  await community.communityNewPostButton.click();
  await page.waitForURL(
    new RegExp(`/submit\\.html\\?category=${COMMUNITY_TAG_SUBSCRIBED}`)
  );

  // Editor opens with the community pre-selected in the "Posting to"
  // dropdown — that's the substantive UX guarantee for COM-06.
  const editor = new PostEditorPage(page);
  await expect(editor.getPostingToListTrigger).toBeVisible();
  await expect(editor.getPostingToListTrigger).toContainText(
    COMMUNITY_NAME_SUBSCRIBED
  );
});
