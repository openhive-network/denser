import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';

/**
 * Profile header — social handles from `posting_json_metadata.profile.social`.
 *
 * The handles are claimed by the account owner, not verified, so every item
 * carries the "not verified" tooltip and `data-verified="false"`. Invalid
 * handles are dropped rather than rendered.
 *
 * Fixtures: `profileSocialLinks` is an overlay on `userProfileTabs` that
 * patches @hiveio's `find_accounts` with `social.x`, `social.ig` and an
 * invalid `social.yt` (see its `_index.json`), so it can only be replayed.
 * The profile without `social` is covered by ANON-PROF-13 in
 * `userProfileTabs.spec.ts`.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- profileSocialLinks
 */

test.use({ fixtureTestName: 'profileSocialLinks' });
test.skip(isRecordMode, 'replay-only: the profileSocialLinks corpus patches the userProfileTabs recording');

const UNVERIFIED = 'Added by the account owner, not verified';

test('PROF-SOCIAL-01: on-chain X and Instagram handles render as unverified links', async ({ page }) => {
  const profilePage = new ProfilePage(page);
  await profilePage.gotoProfilePage('@hiveio');
  await expect(profilePage.profileInfo).toBeVisible();

  const x = profilePage.onChainSocialLink('x');
  await expect(x).toHaveAttribute('href', 'https://x.com/hiveio');
  await expect(x).toHaveAttribute('title', new RegExp(UNVERIFIED));
  await expect(x).toHaveAttribute('data-verified', 'false');

  const ig = profilePage.onChainSocialLink('ig');
  await expect(ig).toHaveAttribute('href', 'https://www.instagram.com/hive.blockchain');
  await expect(ig).toHaveAttribute('title', new RegExp(UNVERIFIED));
  await expect(ig).toHaveAttribute('data-verified', 'false');

  await expect(profilePage.onChainSocialLink('yt')).toHaveCount(0);
  await expect(profilePage.onChainSocialLinks).toHaveCount(2);
});
