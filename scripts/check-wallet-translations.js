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
   * Keys whose value may legitimately be identical to English, per locale ('*'
   * for every locale): product names, abbreviations and words the language
   * borrows unchanged. Each entry needs a comment saying why.
   */
  identicalToEnglishAllowed: {
    '*': new Set([
      // Product, site and exchange names
      'navigation.sidebar.blocktrades',
      'navigation.sidebar.ionomy',
      'navigation.sidebar.openhive_chat',
      'navigation.profile_navbar.blog',
      'navigation.user_menu.blog',
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
    ]),
    es: new Set([
      // Spanish uses the same words
      'market_page.total',
      'resource_credits.total',
      'transfers_page.memo',
      // Hive operation names the Spanish texts keep in English
      'profile.power_up',
      'profile.power_down',
      'transfers_page.power_up',
      'transfers_page.power_down'
    ]),
    fr: new Set([
      // French uses the same words
      'global.time.minutes',
      'global.notifications_region',
      'market_page.total',
      'market_page.date',
      'market_page.type',
      'market_page.action',
      'communities.description',
      'resource_credits.minutes_one',
      'resource_credits.minutes_many',
      'resource_credits.minutes_other',
      'page_titles.permissions',
      // Hive operation names the French texts keep in English
      'profile.power_up',
      'profile.power_down',
      'transfers_page.power_up',
      'transfers_page.power_down'
    ]),
    it: new Set([
      // Italian uses the same words
      'market_page.spread',
      'page_titles.home',
      'transfers_page.memo',
      // Hive role name the Italian texts keep in English
      'witnesses_page.witness'
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
