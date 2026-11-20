import type { IKnownI18nIssue } from '../../../../../playwright/support/i18n-layout';

/**
 * The wallet's part of the i18n layout check (playwright/support/i18n-layout.ts): the subtrees that
 * show chain or user content (account names, proposal titles, witness links), which no locale
 * translates, and the findings waiting for a fix. Run by the `i18n-layout` project
 * (i18nLayout*.spec.ts).
 */
export const WALLET_USER_CONTENT = [
  '[data-testid="profile-name"]',
  '[data-testid="profile-about"]',
  '[data-testid="proposal-title"]',
  '[data-testid="witness-description"]',
  '[data-testid="witness-id-dialog"]',
  '[data-testid="proposal-voter-link-dialog"]'
];

/** Dates the wallet formats with `Intl`, which shows English for the pseudo-locale. */
export const WALLET_INTL_FORMATTED = ['[data-testid="proposal-date"]'];

/** Each finding the check lets through, with the issue that fixes it; remove an entry with its fix. */
export const WALLET_KNOWN_I18N_ISSUES: IKnownI18nIssue[] = [];
