import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  COMMUNITY_TAG_SUBSCRIBED,
  COMMUNITY_TITLE_ESCAPABLE,
  TOAST_UNSUBSCRIBED,
  TOAST_UNSUBSCRIBED_PL,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-03-escape — Leave toast with a title i18next would escape.
 *
 *   The `communityLeaveEscapedTitle` overlay titles the community with `&` and `/`, which
 *   i18next HTML-escapes in interpolated values unless told not to; the toast
 *   must name it verbatim (no `&amp;` / `&#x2F;`) in both locales.
 */

test.use({
  fixtureTestName: 'communityLeaveEscapedTitle',
  authenticatedUser: {}
});

for (const { locale, toast } of [
  { locale: 'en', toast: TOAST_UNSUBSCRIBED },
  { locale: 'pl', toast: TOAST_UNSUBSCRIBED_PL }
]) {
  test(`COM-03-escape-${locale} — the leave toast names a title with & and / verbatim`, async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL ?? '' }]);
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityLoggedIn(page, COMMUNITY_TAG_SUBSCRIBED);

    const community = new CommunitiesPage(page);
    await community.communityJoinedLeaveButton.click();
    await broadcast.waitForCount(1);

    await expect(page.getByText(toast(COMMUNITY_TITLE_ESCAPABLE), { exact: true })).toBeVisible();
  });
}
