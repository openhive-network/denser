#!/usr/bin/env node

/**
 * UI translation usage: runs scripts/translation-usage.js on packages/ui. The package owns no
 * locale files; its components translate with the app's t, in the app's default namespace, so a
 * key passes when the blog or the wallet has it (a component one app renders needs it only there).
 *
 * Usage: node scripts/check-ui-translation-usage.js [--unused]
 */

const path = require('path');
const { validateTranslationUsage } = require('./translation-usage');

const ROOT = path.join(__dirname, '..');

validateTranslationUsage({
  name: 'UI',
  rootDir: path.join(ROOT, 'packages/ui'),
  sourceDirs: ['components', 'config', 'hooks', 'lib'],
  referenceFiles: [
    path.join(ROOT, 'apps/blog/locales/en/common_blog.json'),
    path.join(ROOT, 'apps/wallet/locales/en/common_wallet.json')
  ],
  fixHint: 'Add missing keys to the locales of the app that renders the component'
});
