import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import { DEFAULT_AVATAR_URL, failAvatarRequests } from '../support/avatarImages';

/**
 * A post card avatar that fails to load falls back to the default avatar (#868). Reuses the
 * userProfileTabs recording.
 *
 *   AVATAR-FALLBACK-01 – post card avatar is swapped to the default avatar
 */

test.use({ fixtureTestName: 'userProfileTabs' });

const USER = 'hiveio';

test('AVATAR-FALLBACK-01: post card avatar is swapped to the default avatar', async ({ page }) => {
  await failAvatarRequests(page);
  const profilePage = new ProfilePage(page);
  await profilePage.gotoPostsProfilePage(`@${USER}`);

  const avatar = page.getByTestId('post-card-avatar').first().locator('img');
  await expect(avatar).toHaveAttribute('src', DEFAULT_AVATAR_URL, { timeout: TIMEOUTS.HYDRATION });
});
