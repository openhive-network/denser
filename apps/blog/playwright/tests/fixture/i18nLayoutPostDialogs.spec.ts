import type { Locator, Page } from '@playwright/test';
import { test, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { PostPage } from '../support/pages/postPage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { gotoPostLoggedIn } from '../support/reblogShareContext';
import { clickUntilOpen } from '../support/uiPrimitives';
import { BLOG_KNOWN_I18N_ISSUES, BLOG_NAMES, BLOG_USER_CONTENT } from '../support/i18nLayout';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale,
  type I18nCheckLocale
} from '../../../../../playwright/support/i18n-layout';

/**
 * The signed-in post page, its reblog and share dialogs and the user menu, in the pseudo-locale
 * and in Polish, at a desktop and two phone viewports, in a wide font: every text is translated and
 * fits (playwright/support/i18n-layout.ts). The post and dialogs are uiPrimitivesPostDialogs.spec.ts's.
 */

test.use({ fixtureTestName: 'reblogShare', authenticatedUser: {} });
test.skip(isRecordMode, 'replay-only: shares the reblogShare recording');

const check = (page: Page, locale: I18nCheckLocale, root?: string) =>
  checkI18nLayout(page, { locale, root, userContent: BLOG_USER_CONTENT, names: BLOG_NAMES });

/** Opens the post page in `locale`, then `open`s what `root` finds and checks it. */
async function checkOpened(
  page: Page,
  locale: I18nCheckLocale,
  baseURL: string | undefined,
  open: (page: Page) => { trigger: Locator; opened: Locator },
  root: string
) {
  await setUiLocale(page.context(), locale, baseURL);
  await gotoPostLoggedIn(page);
  const { trigger, opened } = open(page);
  await clickUntilOpen(trigger, opened);
  expectNoI18nIssues(await check(page, locale, root), locale, BLOG_KNOWN_I18N_ISSUES);
}

for (const locale of I18N_CHECK_LOCALES) {
  test(`I18N-POST-DIALOGS-01 [${locale}]: the signed-in post page is translated and fits`, async ({
    page,
    baseURL
  }) => {
    await setUiLocale(page.context(), locale, baseURL);
    await gotoPostLoggedIn(page);
    await new PostPage(page).waitForPostHydration();
    expectNoI18nIssues(await check(page, locale), locale, BLOG_KNOWN_I18N_ISSUES);
  });

  test(`I18N-POST-DIALOGS-02 [${locale}]: the reblog dialog is translated and fits`, async ({ page, baseURL }) => {
    await checkOpened(
      page,
      locale,
      baseURL,
      (page) => ({ trigger: new PostPage(page).footerReblogIcon, opened: page.getByRole('alertdialog') }),
      '[role="alertdialog"]'
    );
  });

  test(`I18N-POST-DIALOGS-03 [${locale}]: the share dialog is translated and fits`, async ({ page, baseURL }) => {
    await checkOpened(
      page,
      locale,
      baseURL,
      (page) => ({ trigger: page.getByTestId('share-post'), opened: page.getByTestId('share-post-dialog') }),
      '[data-testid="share-post-dialog"]'
    );
  });

  test(`I18N-POST-DIALOGS-04 [${locale}]: the user menu is translated and fits`, async ({ page, baseURL }) => {
    await checkOpened(
      page,
      locale,
      baseURL,
      (page) => ({
        trigger: new HomePage(page).profileAvatarButton,
        opened: new ProfileUserMenu(page).profileMenuContent
      }),
      '[role="menu"]'
    );
  });
}
