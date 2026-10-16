import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { ProfilePage } from '../support/pages/profilePage';

/**
 * The profile join date is one translated phrase around a month-year formatted for the UI language,
 * so each language keeps its own word order: "Joined March 2020" in English, "2020년 3월 가입" in Korean.
 *
 * Fixtures: `userProfileTabs` (@hiveio, created 2020-03-06).
 * Replay:  pnpm --filter @hive/blog test:fixture -- profileJoinDate
 */

test.use({ fixtureTestName: 'userProfileTabs' });

const USER = 'hiveio';
const LOCALE_COOKIE = 'NEXT_LOCALE';
const JOINED_EN = 'Joined March 2020';
const JOINED_KO = '2020년 3월 가입';

test('PROF-JOINED-01: English profile reads "Joined <month> <year>"', async ({ page }) => {
  const profilePage = new ProfilePage(page);
  await profilePage.gotoProfilePage(`@${USER}`);

  await expect(profilePage.profileJoined).toHaveText(JOINED_EN, { timeout: TIMEOUTS.HYDRATION });
});

test('PROF-JOINED-02: Korean profile puts the year first, server-side and after hydration', async ({
  page,
  context,
  baseURL,
  request
}) => {
  const html = await (await request.get(`/@${USER}`, { headers: { cookie: `${LOCALE_COOKIE}=ko` } })).text();
  expect(html).toContain(JOINED_KO);

  await context.addCookies([{ name: LOCALE_COOKIE, value: 'ko', url: baseURL ?? '' }]);
  const profilePage = new ProfilePage(page);
  await profilePage.gotoProfilePage(`@${USER}`);

  await expect(profilePage.profileJoined).toHaveText(JOINED_KO, { timeout: TIMEOUTS.HYDRATION });
});
