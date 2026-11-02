import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { CommunitiesPage } from '../support/pages/communitiesPage';
import {
  COMMUNITY_TAG,
  COMMUNITY_TITLE_ESCAPABLE,
  TOAST_SUBSCRIBED,
  TOAST_SUBSCRIBED_PL,
  gotoCommunityLoggedIn
} from '../support/communityContext';

/**
 * §10 — COM-02-escape — Subscribe toast with a title i18next would escape.
 *
 *   The `communitySubscribeEscapedTitle` overlay titles the community with `&` and `/`, which
 *   i18next HTML-escapes in interpolated values unless told not to; the toast
 *   must name it verbatim (no `&amp;` / `&#x2F;`) in both locales.
 */

test.use({
  fixtureTestName: 'communitySubscribeEscapedTitle',
  authenticatedUser: {}
});

for (const { locale, toast } of [
  { locale: 'en', toast: TOAST_SUBSCRIBED },
  { locale: 'pl', toast: TOAST_SUBSCRIBED_PL }
]) {
  test(`COM-02-escape-${locale} — the subscribe toast names a title with & and / verbatim`, async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL ?? '' }]);
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });
    await gotoCommunityLoggedIn(page, COMMUNITY_TAG);

    const community = new CommunitiesPage(page);
    await community.communitySubscribeButton.click();
    await broadcast.waitForCount(1);

    await expect(page.getByText(toast(COMMUNITY_TITLE_ESCAPABLE), { exact: true })).toBeVisible();
  });
}
