/**
 * Translation Validator
 *
 * Compares every locale of an app against English (the reference) and reports:
 * - Missing keys (present in English but missing in the locale)
 * - Extra keys (present in the locale but not in English)
 * - Strings whose interpolation placeholders ({{name}}) or <Trans> tags (<0>)
 *   differ from the English string's
 * - Strings copied verbatim from English, i.e. left untranslated, unless the
 *   key is allowed to stay identical (policy.identicalToEnglishAllowed). In a
 *   locale of policy.reviewedLocales every such string counts; in the others
 *   only sentences (at least MIN_SENTENCE_WORDS words), as their short labels
 *   have not been reviewed yet.
 *
 * i18next plural keys (`base_one`, `base_other`, ...) are matched by plural
 * category: a locale carries the categories its own plural rules define (ja/zh
 * only `_other`, ru/pl `_one`/`_few`/`_many`/`_other`), not English's.
 *
 * Each app's check-<app>-translations.js supplies its locales directory and
 * its policy: { reviewedLocales: Set<locale>, identicalToEnglishAllowed:
 * { '*' | locale: Set<key> } }.
 */

const fs = require('fs');
const path = require('path');

const REFERENCE_LOCALE = 'en';
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const PLURAL_KEY = new RegExp(`^(.+)_(${PLURAL_CATEGORIES.join('|')})$`);
const MAX_LISTED = 10;
const MIN_SENTENCE_WORDS = 4;

/**
 * Flatten a nested translation object into dot-notation leaf keys.
 * @param {object} obj
 * @param {string} prefix
 * @returns {Map<string, string>} leaf key -> string value
 */
function getLeaves(obj, prefix = '') {
  const leaves = new Map();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      getLeaves(value, fullKey).forEach((v, k) => leaves.set(k, v));
    } else {
      leaves.set(fullKey, value);
    }
  }
  return leaves;
}

/**
 * Group the reference keys into i18next plural bases. A key is a plural form
 * only when its base also has an `_other` form, so `exclude_less_than_one`
 * stays an ordinary key.
 * @param {Map<string, string>} reference
 * @returns {Map<string, Set<string>>} plural base -> categories present
 */
function getPluralBases(reference) {
  const bases = new Map();
  for (const key of reference.keys()) {
    const match = PLURAL_KEY.exec(key);
    if (!match || !reference.has(`${match[1]}_other`)) continue;
    if (!bases.has(match[1])) bases.set(match[1], new Set());
    bases.get(match[1]).add(match[2]);
  }
  return bases;
}

/**
 * Work out the keys a locale must have and the keys it may have.
 *
 * For a plural base the locale may carry every category its plural rules
 * define, and must carry all of them except `one` when English omits `one`
 * (the string is only ever shown for counts above one).
 *
 * @param {Map<string, string>} reference
 * @param {string} locale
 * @returns {{ required: Map<string, string>, allowed: Map<string, string> }}
 *   key -> the reference key whose placeholders the translation must match
 */
function getExpectedKeys(reference, locale) {
  const bases = getPluralBases(reference);
  const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  const required = new Map();
  const allowed = new Map();

  for (const key of reference.keys()) {
    const match = PLURAL_KEY.exec(key);
    if (match && bases.has(match[1])) continue;
    required.set(key, key);
    allowed.set(key, key);
  }
  for (const [base, referenceCategories] of bases) {
    for (const category of categories) {
      const key = `${base}_${category}`;
      const source = referenceCategories.has(category) ? key : `${base}_other`;
      allowed.set(key, source);
      if (category !== 'one' || referenceCategories.has('one')) required.set(key, source);
    }
  }
  return { required, allowed };
}

/**
 * The interpolation placeholders and <Trans> tags of a string, sorted.
 * @param {string} value
 * @returns {string[]}
 */
function getPlaceholders(value) {
  if (typeof value !== 'string') return [];
  const interpolations = [...value.matchAll(/\{\{\s*([^},\s]+)[^}]*\}\}/g)].map((m) => `{{${m[1]}}}`);
  const tags = value.match(/<\/?\d+\s*\/?>/g) || [];
  return [...interpolations, ...tags].sort();
}

/**
 * Whether a translation is an untranslated copy of the English string: any
 * copy in a reviewed locale, a sentence-length one elsewhere. Placeholders
 * count as words, so `Paid {{value1}} for {{value2}}` is a sentence.
 * @param {string} key
 * @param {string} value
 * @param {string} englishValue
 * @param {string} locale
 * @param {object} policy
 * @returns {boolean}
 */
function isUntranslated(key, value, englishValue, locale, policy) {
  if (typeof value !== 'string' || value !== englishValue) return false;
  const allowed = policy.identicalToEnglishAllowed;
  if (allowed['*']?.has(key) || allowed[locale]?.has(key)) return false;
  return policy.reviewedLocales.has(locale) || value.trim().split(/\s+/).length >= MIN_SENTENCE_WORDS;
}

/**
 * Compare one locale's leaves against the reference.
 * @param {Map<string, string>} reference
 * @param {Map<string, string>} target
 * @param {string} locale
 * @param {object} policy
 * @returns {{ missing: string[], extra: string[], placeholders: string[], untranslated: string[] }}
 */
function compareLocale(reference, target, locale, policy) {
  const { required, allowed } = getExpectedKeys(reference, locale);
  const missing = [...required.keys()].filter((key) => !target.has(key));
  const extra = [...target.keys()].filter((key) => !allowed.has(key));
  const placeholders = [];
  const untranslated = [];

  for (const [key, value] of target) {
    if (!allowed.has(key)) continue;
    const englishValue = reference.get(allowed.get(key));
    const expected = getPlaceholders(englishValue).join(' ');
    const actual = getPlaceholders(value).join(' ');
    if (expected !== actual) placeholders.push(`${key}: expected [${expected}], got [${actual}]`);
    if (isUntranslated(key, value, englishValue, locale, policy)) untranslated.push(key);
  }
  return { missing, extra, placeholders, untranslated };
}

function loadLeaves(filePath) {
  return getLeaves(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function printList(title, items) {
  if (items.length === 0) return;
  console.log(`      ${title}:`);
  items.slice(0, MAX_LISTED).forEach((item) => console.log(`        - ${item}`));
  if (items.length > MAX_LISTED) console.log(`        ... and ${items.length - MAX_LISTED} more`);
}

/**
 * Check every locale of an app, print a report and exit 1 on any finding.
 * @param {{ appName: string, localesDir: string, policy: object }} options
 */
function validateTranslations({ appName, localesDir, policy }) {
  const locales = fs
    .readdirSync(localesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== REFERENCE_LOCALE)
    .map((dirent) => dirent.name);
  const referenceFiles = fs.readdirSync(path.join(localesDir, REFERENCE_LOCALE)).filter((f) => f.endsWith('.json'));
  let hasErrors = false;

  console.log(`\n📋 Translation Keys Validator (${appName})`);
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`   Checking locales: ${locales.join(', ')}\n`);

  for (const jsonFile of referenceFiles) {
    const reference = loadLeaves(path.join(localesDir, REFERENCE_LOCALE, jsonFile));
    console.log(`📄 ${jsonFile} (${reference.size} keys in ${REFERENCE_LOCALE})`);

    for (const locale of locales) {
      const targetFilePath = path.join(localesDir, locale, jsonFile);
      if (!fs.existsSync(targetFilePath)) {
        console.log(`   ❌ ${locale}: File missing!`);
        hasErrors = true;
        continue;
      }
      const target = loadLeaves(targetFilePath);
      const { missing, extra, placeholders, untranslated } = compareLocale(reference, target, locale, policy);
      if (missing.length + extra.length + placeholders.length + untranslated.length === 0) {
        console.log(`   ✅ ${locale}: OK (${target.size} keys)`);
        continue;
      }
      hasErrors = true;
      console.log(
        `   ⚠️  ${locale}: ${missing.length} missing, ${extra.length} extra, ` +
          `${placeholders.length} placeholder mismatches, ${untranslated.length} untranslated`
      );
      printList('Missing keys', missing);
      printList(`Extra keys (not in ${REFERENCE_LOCALE})`, extra);
      printList('Placeholder mismatches', placeholders);
      printList(`Identical to ${REFERENCE_LOCALE} (untranslated)`, untranslated);
    }
    console.log('');
  }

  for (const locale of locales) {
    const extraFiles = fs
      .readdirSync(path.join(localesDir, locale))
      .filter((f) => f.endsWith('.json') && !referenceFiles.includes(f));
    if (extraFiles.length > 0) {
      console.log(`⚠️  ${locale} has extra files not in ${REFERENCE_LOCALE}: ${extraFiles.join(', ')}`);
      hasErrors = true;
    }
  }

  console.log(hasErrors ? '\n❌ Validation failed!\n' : '\n✅ All translations are in sync!\n');
  process.exit(hasErrors ? 1 : 0);
}

module.exports = { compareLocale, getLeaves, getPlaceholders, validateTranslations };
