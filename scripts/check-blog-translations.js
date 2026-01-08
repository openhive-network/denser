#!/usr/bin/env node

/**
 * Translation Keys Validator
 *
 * Compares translation JSON files across all locales to find:
 * - Missing keys (present in reference locale but missing in others)
 * - Extra keys (present in other locales but not in reference)
 *
 * Usage: node scripts/check-blog-translations.js
 *
 * Reference locale: English (en)
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../apps/blog/locales');
const REFERENCE_LOCALE = 'en';

/**
 * Recursively extract all keys from a nested object
 * @param {object} obj - The object to extract keys from
 * @param {string} prefix - Current key path prefix
 * @returns {Set<string>} Set of dot-notation key paths
 */
function getAllKeys(obj, prefix = '') {
  const keys = new Set();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nestedKeys = getAllKeys(value, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Load and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {object|null} Parsed JSON or null if error
 */
function loadJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Get all locale directories
 * @returns {string[]} Array of locale codes
 */
function getLocales() {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/**
 * Get all JSON files in a locale directory
 * @param {string} locale - Locale code
 * @returns {string[]} Array of JSON filenames
 */
function getJsonFiles(locale) {
  const localeDir = path.join(LOCALES_DIR, locale);
  return fs.readdirSync(localeDir).filter((file) => file.endsWith('.json'));
}

/**
 * Compare keys between reference and target locale
 * @param {Set<string>} referenceKeys - Keys from reference locale
 * @param {Set<string>} targetKeys - Keys from target locale
 * @returns {{ missing: string[], extra: string[] }}
 */
function compareKeys(referenceKeys, targetKeys) {
  const missing = [];
  const extra = [];

  referenceKeys.forEach((key) => {
    if (!targetKeys.has(key)) {
      missing.push(key);
    }
  });

  targetKeys.forEach((key) => {
    if (!referenceKeys.has(key)) {
      extra.push(key);
    }
  });

  return { missing, extra };
}

/**
 * Main validation function
 */
function validateTranslations() {
  const locales = getLocales();

  if (!locales.includes(REFERENCE_LOCALE)) {
    console.error(`Reference locale '${REFERENCE_LOCALE}' not found!`);
    process.exit(1);
  }

  const referenceFiles = getJsonFiles(REFERENCE_LOCALE);
  let hasErrors = false;
  let totalMissing = 0;
  let totalExtra = 0;

  console.log(`\n📋 Translation Keys Validator (Blog)`);
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`   Checking locales: ${locales.filter((l) => l !== REFERENCE_LOCALE).join(', ')}\n`);

  for (const jsonFile of referenceFiles) {
    const referenceFilePath = path.join(LOCALES_DIR, REFERENCE_LOCALE, jsonFile);
    const referenceData = loadJson(referenceFilePath);

    if (!referenceData) {
      hasErrors = true;
      continue;
    }

    const referenceKeys = getAllKeys(referenceData);
    console.log(`📄 ${jsonFile} (${referenceKeys.size} keys in ${REFERENCE_LOCALE})`);

    for (const locale of locales) {
      if (locale === REFERENCE_LOCALE) continue;

      const targetFilePath = path.join(LOCALES_DIR, locale, jsonFile);

      if (!fs.existsSync(targetFilePath)) {
        console.log(`   ❌ ${locale}: File missing!`);
        hasErrors = true;
        continue;
      }

      const targetData = loadJson(targetFilePath);
      if (!targetData) {
        hasErrors = true;
        continue;
      }

      const targetKeys = getAllKeys(targetData);
      const { missing, extra } = compareKeys(referenceKeys, targetKeys);

      if (missing.length === 0 && extra.length === 0) {
        console.log(`   ✅ ${locale}: OK (${targetKeys.size} keys)`);
      } else {
        hasErrors = true;
        totalMissing += missing.length;
        totalExtra += extra.length;

        console.log(`   ⚠️  ${locale}: ${missing.length} missing, ${extra.length} extra`);

        if (missing.length > 0) {
          console.log(`      Missing keys:`);
          missing.slice(0, 10).forEach((key) => console.log(`        - ${key}`));
          if (missing.length > 10) {
            console.log(`        ... and ${missing.length - 10} more`);
          }
        }

        if (extra.length > 0) {
          console.log(`      Extra keys (not in ${REFERENCE_LOCALE}):`);
          extra.slice(0, 5).forEach((key) => console.log(`        + ${key}`));
          if (extra.length > 5) {
            console.log(`        ... and ${extra.length - 5} more`);
          }
        }
      }
    }
    console.log('');
  }

  // Check for files that exist in other locales but not in reference
  for (const locale of locales) {
    if (locale === REFERENCE_LOCALE) continue;

    const localeFiles = getJsonFiles(locale);
    const extraFiles = localeFiles.filter((f) => !referenceFiles.includes(f));

    if (extraFiles.length > 0) {
      console.log(`⚠️  ${locale} has extra files not in ${REFERENCE_LOCALE}: ${extraFiles.join(', ')}`);
      hasErrors = true;
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  if (hasErrors) {
    console.log(`\n❌ Validation failed!`);
    console.log(`   Total missing keys: ${totalMissing}`);
    console.log(`   Total extra keys: ${totalExtra}`);
    console.log(`\n   Fix missing keys by adding them to the respective locale files.`);
    console.log(`   Use English (${REFERENCE_LOCALE}) as the reference.\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ All translations are in sync!\n`);
    process.exit(0);
  }
}

validateTranslations();
