#!/usr/bin/env node

/**
 * Wallet Translation Validator: runs scripts/translation-validator.js on
 * apps/wallet/locales with the wallet's review policy.
 *
 * Usage: node scripts/check-wallet-translations.js
 */

const path = require('path');
const { compareLocale, validateTranslations } = require('./translation-validator');

const POLICY = {
  /**
   * Locales whose every string has been reviewed by a native speaker: a short
   * label identical to English is reported there too.
   */
  reviewedLocales: new Set(['pl']),
  /**
   * Keys whose value may legitimately be identical to English, per locale ('*'
   * for every locale): product names, abbreviations and words the language
   * borrows unchanged. Each entry needs a comment saying why.
   */
  identicalToEnglishAllowed: {
    '*': new Set([
      // Product, site and exchange names
      'navigation.sidebar.blocktrades',
      'navigation.sidebar.ionomy',
      'navigation.profile_navbar.blog',
      'login_form.title_hbauth_form',
      'navigation.user_menu.login_method.keychain',
      'navigation.user_menu.login_method.peakvault',
      'navigation.user_menu.login_method.metamask',
      'navigation.user_menu.login_method.google',
      'navigation.user_menu.login_method.hiveauth',
      'navigation.user_menu.login_method.hivesigner',
      // Abbreviations
      'navigation.sidebar.faq',
      'communities.nsfw',
      'resource_credits.rc',
      // Acknowledgement buttons
      'market_page.ok',
      'witnesses_page.ok',
      'witnesses_page.proxy_form.ok',
      'transfers_page.ok'
    ]),
    pl: new Set([
      // Polish uses the same words
      'select_sort.sort_proposals.status',
      'market_page.spread'
    ])
  }
};

if (require.main === module) {
  validateTranslations({
    appName: 'Wallet',
    localesDir: path.join(__dirname, '../apps/wallet/locales'),
    policy: POLICY
  });
}

module.exports = {
  compareLocale: (reference, target, locale) => compareLocale(reference, target, locale, POLICY)
};
