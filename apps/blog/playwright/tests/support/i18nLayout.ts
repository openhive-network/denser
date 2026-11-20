import type { IKnownI18nIssue } from '../../../../../playwright/support/i18n-layout';

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
  '#articleBody'
];

/** The site's name (`siteConfig.name`), a brand. */
export const BLOG_NAMES = ['Hive Blog'];

/**
 * Each finding the check lets through, with the issue that fixes it; remove an entry with its fix.
 * The follow-ups of #1696 named here are still to be filed: replace `#1696` with their numbers.
 */
export const BLOG_KNOWN_I18N_ISSUES: IKnownI18nIssue[] = [
  // Follow-up of #1696: "Notifications page scrolls sideways on a 390 px phone in Polish"
  {
    kind: 'page-scroll',
    viewport: 'phone',
    match: /notifications-mark-all-read/,
    issue: '#1696 (notifications page scrolls sideways)'
  },
  // Follow-up of #1696: "Feed sort selector cuts off a longer translated label on a phone"
  {
    kind: 'clipped',
    locale: 'xx',
    viewport: 'phone',
    match: /^\[Ţŕéñðîñĝ/,
    issue: '#1696 (feed sort selector)'
  }
];
