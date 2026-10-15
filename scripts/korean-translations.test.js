const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { getLeaves, getPlaceholders } = require('./check-wallet-translations');

const ROOT = path.join(__dirname, '..');
const TRANSLATION_FILES = [
  'apps/blog/locales/{locale}/common_blog.json',
  'apps/wallet/locales/{locale}/common_wallet.json',
  'packages/smart-signer/locales/{locale}/smart-signer.json'
];
const PLURAL_ONE = /^(.+)_one$/;

function loadLeaves(file, locale) {
  return getLeaves(JSON.parse(fs.readFileSync(path.join(ROOT, file.replace('{locale}', locale)), 'utf8')));
}

/** Interpolations, numbered <Trans> tags and named or HTML tags (<start/>, <a href="...">), sorted. */
function getMarkup(value) {
  const namedTags = typeof value === 'string' ? value.match(/<\/?[a-zA-Z][^>]*>/g) || [] : [];
  return [...getPlaceholders(value), ...namedTags].sort();
}

/** Korean has a single plural category, so `base_one` may be left out wherever `base_other` exists. */
function isOptionalInKorean(key, english) {
  const match = PLURAL_ONE.exec(key);
  return Boolean(match) && english.has(`${match[1]}_other`);
}

for (const file of TRANSLATION_FILES) {
  test(`ko ${path.basename(file)} has every English key and no other`, () => {
    const english = loadLeaves(file, 'en');
    const korean = loadLeaves(file, 'ko');
    const missing = [...english.keys()].filter((key) => !korean.has(key) && !isOptionalInKorean(key, english));
    const extra = [...korean.keys()].filter((key) => !english.has(key));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });

  test(`ko ${path.basename(file)} keeps every placeholder and tag of the English string`, () => {
    const english = loadLeaves(file, 'en');
    const korean = loadLeaves(file, 'ko');
    const mismatches = [...korean]
      .filter(([key, value]) => english.has(key) && getMarkup(value).join(' ') !== getMarkup(english.get(key)).join(' '))
      .map(([key, value]) => `${key}: ${value}`);
    assert.deepEqual(mismatches, []);
  });
}
