#!/usr/bin/env node

/**
 * Wallet translation usage: runs scripts/translation-usage.js on apps/wallet against
 * apps/wallet/locales/en.
 *
 * Usage: node scripts/check-wallet-translation-usage.js [--unused]
 */

const path = require('path');
const { validateTranslationUsage } = require('./translation-usage');

const WALLET_DIR = path.join(__dirname, '../apps/wallet');

validateTranslationUsage({
  name: 'Wallet',
  rootDir: WALLET_DIR,
  sourceDirs: ['app', 'components', 'feature', 'lib', 'pages'],
  renderers: [
    {
      name: 'wallet',
      namespaces: { common_wallet: path.join(WALLET_DIR, 'locales/en/common_wallet.json') },
      loads: { 'smart-signer': path.join(__dirname, '../packages/smart-signer/locales/en/smart-signer.json') }
    }
  ],
  fixHint: 'Add missing keys to apps/wallet/locales/en/common_wallet.json'
});
