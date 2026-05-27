import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommunityCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  SUBSCRIBER,
  EDIT_COMMUNITY_TAG,
  ACTION_UPDATE_PROPS,
  TOAST_COMMUNITY_UPDATED,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-08 — Edit community properties (admin action).
 *
 *   Wire — custom_json id="community", json:
 *          ["updateProps", { community, props: { title, about, description,
 *          flag_text, is_nsfw, lang } }] (verified against wax
 *          CommunityOperation.updateProps).
 *   Toast — "You have successfully updated the community <tag>."
 *           (use-update-community-mutation.ts:61).
 *   Precondition — the EditCommunityDialog renders only when the viewer is in
 *          `get_community.team` as admin (community-description.tsx:43,111).
 *          guest4test isn't on hive-139531's team, so the `communityEditProps`
 *          overlay injects it as admin (generate-community-variants.mjs
 *          communityTeam op). Overlays the loggedInTagCommunityFeeds base —
 *          no separate recording; the broadcast is captured live.
 *
 * We change title / about / description and flip NSFW; flag_text ('') and
 * lang ('en') keep their recorded hive-139531 values, so the full props
 * object is deterministic.
 *
 * confirmInBlock IS MANDATORY: updateCommunityProps runs with { observe: true }.
 */

const NEW_TITLE = 'HiveDevs COM08';
const NEW_ABOUT = 'COM-08 edited about';
const NEW_DESCRIPTION = 'COM-08 edited description';

test.use({
  fixtureTestName: 'communityEditProps',
  authenticatedUser: {}
});

test('COM-08 — Edit community properties', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true,
    // Keep get_community consistent with the edit past the 4s refetch so the
    // community page assertion below doesn't race the revert to fixture values.
    communityUpdateSwap: { community: EDIT_COMMUNITY_TAG }
  });
  await gotoCommunityLoggedIn(page, EDIT_COMMUNITY_TAG);

  const community = new CommunitiesPage(page);
  // Admin precondition — the trigger renders only because the overlay put
  // guest4test in team as admin.
  await expect(community.editPropsTrigger).toBeVisible();

  await community.editCommunityProps({
    title: NEW_TITLE,
    about: NEW_ABOUT,
    description: NEW_DESCRIPTION,
    toggleNsfw: true // recorded is_nsfw is false → flips to true
  });
  await broadcast.waitForCount(1);

  expectCommunityCustomJson(broadcast.calls[0], {
    required_auth: SUBSCRIBER,
    action: ACTION_UPDATE_PROPS,
    payload: {
      community: EDIT_COMMUNITY_TAG,
      props: {
        title: NEW_TITLE,
        about: NEW_ABOUT,
        description: NEW_DESCRIPTION,
        flag_text: '',
        is_nsfw: true,
        lang: 'en'
      }
    }
  });

  await expect(
    page.getByText(TOAST_COMMUNITY_UPDATED(EDIT_COMMUNITY_TAG), { exact: true })
  ).toBeVisible();

  // The community page must actually reflect the edit — the sidebar title and
  // short description show the new values. The hook fix (observer-keyed
  // optimistic write in useUpdateCommunityMutation.onSettled) updates them
  // immediately; communityUpdateSwap keeps them consistent past the 4s
  // invalidation+refetch (which would otherwise revert to the fixture).
  await expect(community.communityNameTitle).toHaveText(NEW_TITLE);
  await expect(community.communityShortDescription).toHaveText(NEW_ABOUT);
  // `description` renders as markdown via RendererContainer, so assert on
  // contained text rather than exact.
  await expect(community.communityDescriptionConntent).toContainText(NEW_DESCRIPTION);
  // NSFW was toggled on → the red NSFW badge appears on the community card
  // (data.is_nsfw drives it; the optimistic write + communityUpdateSwap make
  // it true). It is absent in the recorded hive-139531 state.
  await expect(community.communityNsfwBadge).toBeVisible();
});
