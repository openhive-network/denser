#!/usr/bin/env node

/**
 * Smart Signer translation usage: runs scripts/translation-usage.js on packages/smart-signer.
 * Its components translate in their own namespace (locales/en/smart-signer.json), which both apps
 * load, or, given the app's t or through i18next's fallbackNS, in the app's default namespace: a
 * key passes when smart-signer.json has it or the blog and the wallet both do.
 *
 * Usage: node scripts/check-smart-signer-translation-usage.js [--unused]
 */

const path = require('path');
const { validateTranslationUsage } = require('./translation-usage');

const ROOT = path.join(__dirname, '..');
const SMART_SIGNER = path.join(ROOT, 'packages/smart-signer/locales/en/smart-signer.json');

validateTranslationUsage({
  name: 'Smart Signer',
  rootDir: path.join(ROOT, 'packages/smart-signer'),
  sourceDirs: ['components', 'lib'],
  renderers: [
    {
      name: 'blog',
      namespaces: {
        'smart-signer': SMART_SIGNER,
        common_blog: path.join(ROOT, 'apps/blog/locales/en/common_blog.json')
      }
    },
    {
      name: 'wallet',
      namespaces: {
        'smart-signer': SMART_SIGNER,
        common_wallet: path.join(ROOT, 'apps/wallet/locales/en/common_wallet.json')
      }
    }
  ],
  fixHint: 'Add missing keys to packages/smart-signer/locales/en/smart-signer.json, or to both apps'
});
