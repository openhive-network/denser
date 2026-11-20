import { test, expect } from './fixture-proxy-test';
import { TIMEOUTS } from './constants';
import {
  I18N_CHECK_LOCALES,
  checkI18nLayout,
  expectNoI18nIssues,
  setUiLocale,
  type IKnownI18nIssue
} from '../../../../../playwright/support/i18n-layout';

/**
 * The blog's part of the i18n layout check (playwright/support/i18n-layout.ts): the subtrees that
 * show user content (post and community texts, account names, tags), which no locale translates, and
 * the findings waiting for a fix. Run by the `i18n-layout` project (i18nLayout*.spec.ts).
 */
export const BLOG_USER_CONTENT = [
  '[data-testid="post-title"]',
  // The card's summary box, which cuts a long summary short
  ':has(> [data-testid="post-description"])',
  '[data-testid="post-author"]',
  '[data-testid="post-card-community"]',
  '[data-testid="community-name"]',
  '[data-testid="post-card-category"]',
  '[data-testid="affiliation-tag-badge"]',
  '[data-testid="card-trending-comunities"] a',
  '[data-testid="post-user-affiliation-tag"]',
  '[data-testid="comment-user-affiliation-tag"]',
  '[data-testid="author-name"]',
  '[data-testid="article-title"]',
  '[data-testid="hashtags-post"]',
  '[data-testid="comment-community-title"]',
  '[data-testid="footer-comment-community-category-link"]',
  '[data-testid="profile-name"]',
  '[data-testid="profile-about"]',
  '[data-testid="author-community-subscribed-link"]',
  '[data-testid="author-affiliation-tag"]',
  '[data-testid="cross-post-original-link"]',
  '[data-testid="community-sidebar-title"]',
  '[data-testid="short-community-description"]',
  '[data-testid="community-simple-about"]',
  // A language code the community chose
  '[data-testid="community-choosen-language"]',
  '[data-testid="community-role-title"]',
  '[data-testid="community-list-item-title"]',
  '[data-testid="community-list-item-about"]',
  '[data-testid="user-location"]',
  // The feed selector shows the community's title, or the feed's translated name
  '[data-testid="communities-select-value"]',
  '[data-testid="user-name-in-profile-menu"]',
  // The "Hive Blog" wordmark of the user menu, in two lines
  '[data-testid="login-method-wordmark"]',
  '#articleBody'
];

/** The site's name (`siteConfig.name`), a brand. */
export const BLOG_NAMES = ['Hive Blog'];

/** Each finding the check lets through, with the issue that fixes it; remove an entry with its fix. */
export const BLOG_KNOWN_I18N_ISSUES: IKnownI18nIssue[] = [];

/** A route of an i18nLayout*.spec.ts, checked as a whole page in every I18N_CHECK_LOCALES. */
export interface II18nRoute {
  /** The test ID's suffix: `I18N-ROUTE-<id>`. */
  id: string;
  path: string;
  /** An element the route shows once its data is in. */
  ready: string;
  /** The spec signs in its recording's user (`authenticatedUser`): wait until the header shows it. */
  loggedIn?: boolean;
  /**
   * Subtrees a third-party package renders with its own English text and no way to pass it ours:
   * the route's allow-list, each with the issue that asks the package for it.
   */
  thirdParty?: { selector: string; issue: string }[];
}

/** Declares the tests of `routes` on the spec's recording (its top-level `test.use`). */
export function testI18nRoutes(routes: II18nRoute[]): void {
  for (const route of routes) {
    for (const locale of I18N_CHECK_LOCALES) {
      test(`I18N-ROUTE-${route.id} [${locale}]: ${route.path} is translated and fits`, async ({
        page,
        context,
        baseURL
      }) => {
        await setUiLocale(context, locale, baseURL);
        await page.goto(route.path);
        if (route.loggedIn) {
          await expect(page.getByTestId('login-btn')).toBeHidden({ timeout: TIMEOUTS.HYDRATION });
        }
        await expect(page.locator(route.ready).first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

        const issues = await checkI18nLayout(page, {
          locale,
          userContent: [...BLOG_USER_CONTENT, ...(route.thirdParty ?? []).map(({ selector }) => selector)],
          names: BLOG_NAMES
        });
        expectNoI18nIssues(issues, locale, BLOG_KNOWN_I18N_ISSUES);
      });
    }
  }
}
