import { test, expect } from '../support/fixture-proxy-test';
import { UserListPage } from '../support/pages/userListPage';
import { TIMEOUTS } from '../support/constants';
import { DEFAULT_AVATAR_URL, failAvatarRequests } from '../support/avatarImages';

/**
 * A listed account's avatar that fails to load is swapped to the default avatar (#868). Reuses the
 * userLists recording; its own spec file because the fixture dir is worker-scoped.
 *
 *   AVATAR-FALLBACK-02 – user list avatar is swapped to the default avatar
 */

test.use({ fixtureTestName: 'userLists' });

const USER_WITH_ENTRIES = 'hive.blog';

test('AVATAR-FALLBACK-02: user list avatar is swapped to the default avatar', async ({ page }) => {
  await failAvatarRequests(page);
  const userList = new UserListPage(page);
  await userList.gotoListPage(USER_WITH_ENTRIES, 'blacklisted');

  const avatar = userList.items.first().locator('img');
  await avatar.scrollIntoViewIfNeeded({ timeout: TIMEOUTS.HYDRATION });
  await expect(avatar).toHaveAttribute('src', DEFAULT_AVATAR_URL, { timeout: TIMEOUTS.HYDRATION });
});
