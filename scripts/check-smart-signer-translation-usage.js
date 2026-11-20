#!/usr/bin/env node

/**
 * Smart Signer translation usage: runs scripts/translation-usage.js on packages/smart-signer.
 * Its components translate in their own namespace (locales/en/smart-signer.json) or, given the
 * app's t, in the app's default namespace, which both apps must then carry: a key passes when one
 * of those files has it.
 *
 * Usage: node scripts/check-smart-signer-translation-usage.js [--unused]
 */

const path = require('path');
const { validateTranslationUsage } = require('./translation-usage');

const ROOT = path.join(__dirname, '..');

validateTranslationUsage({
  name: 'Smart Signer',
  rootDir: path.join(ROOT, 'packages/smart-signer'),
  sourceDirs: ['components', 'lib'],
  referenceFiles: [
    path.join(ROOT, 'packages/smart-signer/locales/en/smart-signer.json'),
    path.join(ROOT, 'apps/blog/locales/en/common_blog.json'),
    path.join(ROOT, 'apps/wallet/locales/en/common_wallet.json')
  ],
  fixHint: 'Add missing keys to packages/smart-signer/locales/en/smart-signer.json, or to both apps'
});
