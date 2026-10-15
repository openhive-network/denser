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
   * Locales whose every string has been reviewed by a native speaker: a short
   * label identical to English is reported there too.
   */
  reviewedLocales: new Set(['pl']),
  /**
   * Keys whose value may legitimately be identical to English, per locale ('*'
   * for every locale): product names. Each entry needs a comment saying why.
   */
  identicalToEnglishAllowed: {
    '*': new Set([
      // Signing service names
      'login_form.signin_with_hiveauth',
      'login_form.signin_with_hivesigner'
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
