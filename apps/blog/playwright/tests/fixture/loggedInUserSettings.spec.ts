import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectAccountUpdate2Operation
} from '../support/fixture-auth/broadcast-interceptor';
import { AdvancedSettingsModal } from '../support/pages/advancedSettingsModal';
import { CommentEditorPage } from '../support/pages/commentEditorPage';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import { ProfilePage } from '../support/pages/profilePage';
import { SettingsPage } from '../support/pages/settingsPage';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';
import { gotoLoggedIn } from '../support/postDisplayContext';
import { TIMEOUTS } from '../support/constants';
import {
  NSFW_FEED_URL,
  SETTINGS_USER,
  TEST_ABOUT,
  TEST_DISPLAY_NAME,
  TEST_LOCATION,
  TEST_WEBSITE,
  expectPreferences,
  prefPostUrl
} from '../support/userSettingsContext';

/**
 * §8 User Profile & Settings — logged-in user editing their own settings.
 *
 * Covers SET-01..04 (profile fields → account_update2 broadcast, TX-10)
 * and SET-07..13 (NSFW / blog rewards / comment rewards / referral system
 * preferences → user-preferences-{username} localStorage, no broadcast).
 *
 * SET-05/06 (profile/cover image) are intentionally out of scope here —
 * the form exposes a URL-text path and a signed-upload path; covering
 * the upload variant requires stubbing the image-endpoint POST and is
 * not yet in scope.
 *
 * Settings page is gated on `user.isLoggedIn && user.username === username`
 * (apps/blog/app/[param]/(user-profile)/settings/content.tsx:12), so all
 * specs navigate to `/@{SETTINGS_USER}/settings`.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInUserSettings.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInUserSettings
 */

test.use({
  fixtureTestName: 'loggedInUserSettings',
  authenticatedUser: {}
});

test.describe('§8 User Profile & Settings', () => {
  let settings: SettingsPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    settings = new SettingsPage(page);
    profilePage = new ProfilePage(page);
  });

  // ── §8.1 Profile Settings (TX-10 account_update2) ─────────────────────
  //
  // The settings page sits inside the (user-profile) route group, so the
  // profile header — `profile-name`, `profile-about`, `user-location`,
  // website link in the metadata row — renders **above** the form on the
  // same page. Both subscribe to the same `['profileData', username]`
  // React Query.
  //
  // After submit, `useUpdateProfileMutation.onSettled` writes the new
  // profile into the cache optimistically; the header re-renders
  // immediately. The mutation also schedules a refetch after 4 seconds —
  // `profileUpdateSwap` patches that refetch so the header stays on the
  // new values instead of snapping back to the recorded fixture.
  //
  // Each test therefore asserts THREE layers:
  //   1. Wire — broadcast carried the right account_update2 payload (TX-10).
  //   2. Notification — success toast appears.
  //   3. UI — the visible profile header reflects the new value.

  test('SET-01 — Change display name', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      profileUpdateSwap: { account: SETTINGS_USER }
    });
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.nameInput.fill(TEST_DISPLAY_NAME);
    await settings.updateButton.click();
    await broadcast.waitForCount(1);

    expectAccountUpdate2Operation(broadcast.calls[0], {
      account: SETTINGS_USER,
      profile: { name: TEST_DISPLAY_NAME, version: 2 }
    });

    await expect(settings.changesSavedToast).toBeVisible();
    await expect(profilePage.profileName).toHaveText(TEST_DISPLAY_NAME);
  });

  test('SET-02 — Change about/bio', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      profileUpdateSwap: { account: SETTINGS_USER }
    });
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.aboutInput.fill(TEST_ABOUT);
    await settings.updateButton.click();
    await broadcast.waitForCount(1);

    expectAccountUpdate2Operation(broadcast.calls[0], {
      account: SETTINGS_USER,
      profile: { about: TEST_ABOUT, version: 2 }
    });

    await expect(settings.changesSavedToast).toBeVisible();
    // profile-about renders the first 157 chars; TEST_ABOUT is well under that.
    await expect(profilePage.profileAbout).toHaveText(TEST_ABOUT);
  });

  test('SET-03 — Change location', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      profileUpdateSwap: { account: SETTINGS_USER }
    });
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.locationInput.fill(TEST_LOCATION);
    await settings.updateButton.click();
    await broadcast.waitForCount(1);

    expectAccountUpdate2Operation(broadcast.calls[0], {
      account: SETTINGS_USER,
      profile: { location: TEST_LOCATION, version: 2 }
    });

    await expect(settings.changesSavedToast).toBeVisible();
    await expect(profilePage.profileLocation).toHaveText(TEST_LOCATION);
  });

  test('SET-04 — Change website', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      profileUpdateSwap: { account: SETTINGS_USER }
    });
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.websiteInput.fill(TEST_WEBSITE);
    await settings.updateButton.click();
    await broadcast.waitForCount(1);

    expectAccountUpdate2Operation(broadcast.calls[0], {
      account: SETTINGS_USER,
      profile: { website: TEST_WEBSITE, version: 2 }
    });

    await expect(settings.changesSavedToast).toBeVisible();
    await expect(profilePage.profileWebsiteLink(TEST_WEBSITE)).toBeVisible();
  });

  // ── §8.2 Preferences (localStorage + downstream consumer) ─────────────
  //
  // Each test sets a preference via the form's Radix `<Select>`, verifies
  // the change landed in `user-preferences-{username}` localStorage, then
  // navigates to the page that actually CONSUMES the preference and
  // asserts the visible effect. The consumer pages share the same
  // localStorage key (`useStorageWithTTL('user-preferences-{user}')`),
  // so the preference written on the settings page round-trips to the
  // editor / post / feed without any chain interaction.

  test('SET-07 — Blog rewards: Decline Payout → post editor default', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.blogRewardsSelectTrigger, 'Decline Payout');
    await expectPreferences(page, { blog_rewards: '0%' });

    // /submit.html → open Advanced Settings dialog. The dialog renders
    // "Default: <authorRewardsText(preferences.blog_rewards)>" under the
    // Author Rewards section — and pre-selects the "Decline Payout" max
    // payout radio via the initial useState in advanced-settings-post-form.tsx.
    await gotoLoggedIn(page, '/submit.html');
    const editor = new PostEditorPage(page);
    await expect(editor.getAdvancedSettingsButton).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await editor.getAdvancedSettingsButton.click();
    const advanced = new AdvancedSettingsModal(page);
    await expect(advanced.advancedSettingsTitleElement).toBeVisible();
    await expect(advanced.defaultPayoutText('Decline Payout')).toBeVisible();
    // Radix Checkbox primitives are `className="hidden"` (display:none) so
    // `data-state="checked"` isn't a usable signal. The active radio shows
    // visually via a `border-destructive bg-border` class on the sibling
    // <Label htmlFor="...">. Match on that instead.
    await expect(advanced.maxPayoutOptionLabel('0')).toHaveClass(/border-destructive/);

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-08 — Blog rewards: Power Up 100% → post editor default', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.blogRewardsSelectTrigger, 'Power Up 100%');
    await expectPreferences(page, { blog_rewards: '100%' });

    // For blog_rewards === '100%' the dialog pre-selects maxPayout=no_max
    // and rewards=100% (see advanced-settings-post-form.tsx:74-78).
    await gotoLoggedIn(page, '/submit.html');
    const editor = new PostEditorPage(page);
    await expect(editor.getAdvancedSettingsButton).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await editor.getAdvancedSettingsButton.click();
    const advanced = new AdvancedSettingsModal(page);
    await expect(advanced.advancedSettingsTitleElement).toBeVisible();
    await expect(advanced.defaultPayoutText('Power Up 100%')).toBeVisible();
    await expect(advanced.maxPayoutOptionLabel('no_max')).toHaveClass(/border-destructive/);
    await expect(advanced.payoutTypeOptionLabel('100%')).toHaveClass(/border-destructive/);

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-09 — Comment rewards: Decline Payout → reply box notice', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.commentRewardsSelectTrigger, 'Decline Payout');
    await expectPreferences(page, { comment_rewards: '0%' });

    // Post detail → click reply → ReplyTextbox renders. Its footer shows
    // "Rewards: <Decline Payout|Power up 100%>" + "Update settings" link
    // whenever `preferences.comment_rewards !== '50%'`
    // (reply-textbox.tsx:408-417).
    await gotoLoggedIn(page, prefPostUrl());
    const postPage = new PostPage(page);
    await expect(postPage.commentReplay).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await postPage.commentReplay.click();
    const commentEditor = new CommentEditorPage(page);
    await expect(commentEditor.getReplayEditorElement).toBeVisible();
    await expect(commentEditor.rewardsNotice('Decline Payout')).toBeVisible();

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-10 — Comment rewards: Power Up 100% → reply box notice', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.commentRewardsSelectTrigger, 'Power Up 100%');
    await expectPreferences(page, { comment_rewards: '100%' });

    await gotoLoggedIn(page, prefPostUrl());
    const postPage = new PostPage(page);
    await expect(postPage.commentReplay).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await postPage.commentReplay.click();
    const commentEditor = new CommentEditorPage(page);
    await expect(commentEditor.getReplayEditorElement).toBeVisible();
    // Note: lowercase 'up' in the comment-footer translation
    // (post_content.footer.comment.power_up: 'Power up 100%') vs the
    // capitalized one in settings_page.power_up.
    await expect(commentEditor.rewardsNotice('Power up 100%')).toBeVisible();

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-11 — NSFW: Always Hide → NSFW feed renders no post cards', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.nsfwSelectTrigger, 'Always hide');
    await expectPreferences(page, { nsfw: 'hide' });

    // /trending/nsfw is a tag feed — every post returned by the chain
    // there carries `'nsfw'` in its tags. PostListItem returns `null`
    // for the `<Card>` body when `nsfw === 'hide'` (post-list-item.tsx:115);
    // the wrapping `<li data-testid="post-list-item">` still mounts, but
    // it has 0 height (empty content), so `toBeVisible` fails. Wait on
    // count instead, then assert no post-author renders inside.
    await gotoLoggedIn(page, NSFW_FEED_URL);
    const nsfwFeed = new TagCommunityFeedsPage(page);
    await expect(nsfwFeed.postListItems).not.toHaveCount(0, {
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(nsfwFeed.postAuthors).toHaveCount(0);

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-12 — NSFW: Always Show → NSFW feed renders cards without warn overlay', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(settings.nsfwSelectTrigger, 'Always show');
    await expectPreferences(page, { nsfw: 'show' });

    // With `nsfw === 'show'`, PostListItem renders normally — author +
    // avatar are present (post-list-item.tsx:152, 163), so the wrapping
    // <li> has actual content and is visible.
    await gotoLoggedIn(page, NSFW_FEED_URL);
    const nsfwFeed = new TagCommunityFeedsPage(page);
    await expect(nsfwFeed.postListItems.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(nsfwFeed.postAuthors.first()).toBeVisible();

    expect(broadcast.calls).toHaveLength(0);
  });

  test('SET-13 — Referral system: Opt-Out (localStorage only, no consumer)', async ({ page }) => {
    // SET-13 has no downstream effect: `referral_system` is written by
    // the settings form but no other code path reads it
    // (`grep -rn 'referral_system' apps/blog packages` returns only the
    // form, the type declaration, and DEFAULT_PREFERENCES). Treat this
    // test as a "preference round-trip" only — and update the assertion
    // matrix if/when a consumer lands. Likely candidates: post-form-state
    // (default beneficiaries) or transaction/index.ts.
    const broadcast = await installBroadcastInterceptor(page);
    await gotoLoggedIn(page, `/@${SETTINGS_USER}/settings`);
    await settings.waitForReady();

    await settings.setPreferenceByLabel(
      settings.referralSelectTrigger,
      'Opt-Out Referral System'
    );
    await expectPreferences(page, { referral_system: 'disabled' });
    expect(broadcast.calls).toHaveLength(0);
  });
});
