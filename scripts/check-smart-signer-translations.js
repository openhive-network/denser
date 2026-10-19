#!/usr/bin/env node

/**
 * Smart Signer Translation Validator: runs scripts/translation-validator.js on
 * packages/smart-signer/locales, the login and signing texts both apps load.
 *
 * Usage: node scripts/check-smart-signer-translations.js
 */

const path = require('path');
const { compareLocale, validateTranslations } = require('./translation-validator');

const POLICY = {
  /**
   * Keys whose value may legitimately be identical to English, per locale ('*'
   * for every locale): product names and words the language borrows unchanged.
   * Each entry needs a comment saying why.
   */
  identicalToEnglishAllowed: {
    '*': new Set([
      // Signing service names
      'login_form.signin_with_hiveauth',
      'login_form.signin_with_hivesigner'
    ]),
    it: new Set([
      // Italian uses the same word
      'password_form.password_placeholder'
    ])
  }
};

if (require.main === module) {
  validateTranslations({
    appName: 'Smart Signer',
    localesDir: path.join(__dirname, '../packages/smart-signer/locales'),
    policy: POLICY
  });
}

module.exports = {
  compareLocale: (reference, target, locale) => compareLocale(reference, target, locale, POLICY)
};
