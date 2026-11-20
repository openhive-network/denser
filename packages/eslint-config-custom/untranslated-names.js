// Names every locale keeps as they are (.aidev/i18n/glossary.en.md, "Untranslated names"), longest first
// so a regex alternation matches "Hive Keychain" before "Hive". Matched in any case: an "nsfw" tag is one.
// The ESLint guard against hard-coded text and the fixture suites' pseudo-locale check
// (playwright/support/i18n-layout.ts) let them stand untranslated.
module.exports = [
  'HIVE DOLLARS',
  'Hive Keychain',
  'Hive Wallet',
  'Hive Bridge',
  'Hive Power',
  'Google Drive',
  'Hive.blog',
  'Hive.io',
  'Blocktrades',
  'Hivesigner',
  'PeakVault',
  'HiveAuth',
  'Hivebuzz',
  'Keychain',
  'MetaMask',
  'OpenHive',
  'Ionomy',
  'Ecency',
  'PeakD',
  'Hive',
  'NSFW',
  'FAQ',
  'DHF',
  'CSV',
  'API',
  'HBD',
  'HP',
  'RC'
];
