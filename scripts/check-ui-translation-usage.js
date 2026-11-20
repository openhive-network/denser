#!/usr/bin/env node

/**
 * UI translation usage: runs scripts/translation-usage.js on packages/ui. The package owns no
 * locale files; its components translate with the app's t, in the app's default namespace, so a
 * key must be in the blog's and the wallet's English file alike. A component only one app renders
 * names that app's namespace in the call: t('search_mode.sort_by', { ns: 'common_blog' }).
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
  renderers: [
    { name: 'blog', namespaces: { common_blog: path.join(ROOT, 'apps/blog/locales/en/common_blog.json') } },
    {
      name: 'wallet',
      namespaces: { common_wallet: path.join(ROOT, 'apps/wallet/locales/en/common_wallet.json') }
    }
  ],
  fixHint:
    "Add missing keys to the locales of each app that renders the component, or name the namespace of the only app that does ({ ns: 'common_blog' })"
});
