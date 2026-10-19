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
      'user_profile.social.platforms.x',
      'navigation.sidebar.openhive_chat',
      // Abbreviations
      'navigation.sidebar.faq',
      'page_titles.faq',
      'communities.edit_props_dialog.nsfw',
      // Acknowledgement buttons
      'post_content.flag.ok',
      'vote_removal_dialog.confirm',
      // Example input formats (a Nostr public key prefix, a Bluesky handle), not text
      'settings_page.social_placeholders.nostr',
      'settings_page.social_placeholders.bsky'
    ]),
    pl: new Set([
      // Polish uses the same word
      'communities.mod',
      'page_titles.blog'
    ]),
    es: new Set([
      // Spanish uses the same word
      'page_titles.blog',
      'chat_widget.chat',
      'submit_page.spoiler',
      'navigation.profile_navbar.social',
      'navigation.profile_social_tab_navbar.personal',
      'communities.roles',
      'page_titles.sections.roles'
    ]),
    fr: new Set([
      // French uses the same word
      'page_titles.blog',
      'submit_page.spoiler',
      'submit_page.toolbar.image',
      'global.time.minutes',
      'global.notifications_region',
      'navigation.profile_navbar.social',
      'navigation.profile_navbar.notifications',
      'navigation.user_menu.notifications',
      'navigation.profile_social_tab_navbar.badges',
      'navigation.profile_notifications_tab_navbar.mentions',
      'communities.notes',
      'communities.titles.description',
      'post_content.suggestions.title',
      'select_sort.sort_comments.votes',
      'cards.post_card.vote',
      'cards.post_card.votes',
      'post_content.footer.vote',
      'post_content.footer.votes'
    ]),
    it: new Set([
      // Italian uses the same word
      'page_titles.blog',
      'chat_widget.chat',
      'submit_page.spoiler',
      'settings_page.endpoint',
      'cards.post_card.in',
      'post_content.in',
      'post_content.footer.in',
      'user_profile.lists.post_count.one'
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
