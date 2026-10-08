import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { FOLLOWER, FOLLOW_TARGET_USER, gotoProfileLoggedIn } from '../support/followMuteContext';

/**
 * A logged-in reader (the `observer` cookie plus localStorage `user`) still sees their
 * follow state on a profile: in the `socialFollow_followed` recording {follower}
 * follows `hiveio`, so its profile offers "Unfollow".
 */

test.use({ fixtureTestName: 'socialFollow_followed', authenticatedUser: {} });

test('LOGGED-STATE-02: a logged-in profile page renders the reader\'s follow state', async ({ page, context }) => {
  const observerCookie = (await context.cookies()).find((cookie) => cookie.name === 'observer');
  expect(observerCookie?.value).toBe(FOLLOWER);

  await gotoProfileLoggedIn(page, FOLLOW_TARGET_USER);
  await expect(new ProfilePage(page).followButton).toHaveText('Unfollow');
});
