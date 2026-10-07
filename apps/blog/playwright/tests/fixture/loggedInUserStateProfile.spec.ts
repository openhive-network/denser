import { test, expect } from '../support/fixture-proxy-test';
import { ProfilePage } from '../support/pages/profilePage';
import { gotoProfileLoggedIn } from '../support/followMuteContext';

/**
 * A logged-in reader's follow state renders on a profile.
 *
 * Runs against `socialFollow_followed/`: the observer (seeded through the `observer`
 * cookie and the localStorage user) already follows `hiveio`, so the profile header
 * offers "Unfollow" once the observer's following list has loaded.
 */

test.use({
  fixtureTestName: 'socialFollow_followed',
  authenticatedUser: {}
});

test('LOGGED-STATE-02: the observer\'s follow state renders on a followed profile', async ({ page }) => {
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.followButton).toHaveText('Unfollow');
  await expect(profile.followButton).toBeEnabled();
});
