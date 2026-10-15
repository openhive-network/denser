#!/usr/bin/env node

/**
 * Blog Translation Validator: runs scripts/translation-validator.js on
 * apps/blog/locales with the blog's review policy.
 *
 * Usage: node scripts/check-blog-translations.js
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
      // Product, site, protocol and social platform names
      'navigation.profile_navbar.blog',
      'navigation.user_menu.login_method.keychain',
      'navigation.user_menu.login_method.peakvault',
      'navigation.user_menu.login_method.metamask',
      'navigation.user_menu.login_method.google',
      'navigation.user_menu.login_method.hiveauth',
      'navigation.user_menu.login_method.hivesigner',
      'login_form.title_hbauth_form',
      'user_profile.social.platforms.ig',
      'user_profile.social.platforms.yt',
      'user_profile.social.platforms.tg',
      'user_profile.social.platforms.bsky',
      'user_profile.social.platforms.dc',
      'user_profile.social.platforms.nostr',
      // Abbreviations
      'navigation.sidebar.faq',
      'page_titles.faq',
      'communities.edit_props_dialog.nsfw',
      // Example input format (a Nostr public key prefix), not text
      'settings_page.social_placeholders.nostr'
    ]),
    pl: new Set([
      // Polish uses the same word
      'communities.mod',
      'page_titles.blog'
    ])
  }
};

if (require.main === module) {
  validateTranslations({
    appName: 'Blog',
    localesDir: path.join(__dirname, '../apps/blog/locales'),
    policy: POLICY
  });
}

module.exports = {
  compareLocale: (reference, target, locale) => compareLocale(reference, target, locale, POLICY)
};
