#!/usr/bin/env node

/**
 * Translation Usage Validator
 *
 * Scans source files for translation key usage and validates:
 * - All used translation keys exist in the reference locale (English)
 * - Reports unused translation keys (optional, with --unused flag)
 *
 * Usage:
 *   node scripts/check-blog-translation-usage.js          # Check for missing keys
 *   node scripts/check-blog-translation-usage.js --unused # Also report unused keys
 */

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../apps/blog');
const LOCALES_DIR = path.join(BLOG_DIR, 'locales');
const REFERENCE_LOCALE = 'en';
const SOURCE_DIRS = ['app', 'components', 'features', 'lib', 'pages'];
const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// Patterns to match translation function calls
// Matches: t('key'), t("key"), t(`key`), <Trans i18nKey="key">
const TRANSLATION_PATTERNS = [
  /\bt\(\s*['"`]([^'"`\n]+?)['"`]\s*(?:,|\))/g,
  /i18nKey\s*=\s*['"`]([^'"`\n]+?)['"`]/g
];

/**
 * Recursively get all keys from a nested object
 * @param {object} obj
 * @param {string} prefix
 * @returns {Set<string>}
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
 * Load translation keys from reference locale
 * @returns {Set<string>}
 */
function loadTranslationKeys() {
  const keys = new Set();
  const localeDir = path.join(LOCALES_DIR, REFERENCE_LOCALE);

  if (!fs.existsSync(localeDir)) {
    console.error(`Reference locale directory not found: ${localeDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(localeDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const fileKeys = getAllKeys(content);
      fileKeys.forEach((k) => keys.add(k));
    } catch (error) {
      console.error(`Error loading ${filePath}: ${error.message}`);
    }
  }

  return keys;
}

/**
 * Recursively find all source files
 * @param {string} dir
 * @returns {string[]}
 */
function findSourceFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findSourceFiles(fullPath));
      }
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract translation keys from a source file
 * @param {string} filePath
 * @returns {{ keys: Map<string, number[]>, file: string }}
 */
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const keys = new Map(); // key -> [line numbers]

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of TRANSLATION_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];

        // Skip dynamic keys (containing variables)
        if (key.includes('${') || key.includes('{') || key.includes('+')) {
          continue;
        }

        if (!keys.has(key)) {
          keys.set(key, []);
        }
        keys.get(key).push(lineNum + 1);
      }
    }
  }

  return { keys, file: filePath };
}

/**
 * Main validation function
 */
function validateTranslationUsage() {
  const showUnused = process.argv.includes('--unused');

  console.log('\n📋 Translation Usage Validator (Blog)');
  console.log(`   Reference locale: ${REFERENCE_LOCALE}`);
  console.log(`   Scanning: ${SOURCE_DIRS.join(', ')}\n`);

  // Load all valid translation keys
  const validKeys = loadTranslationKeys();
  console.log(`   Found ${validKeys.size} translation keys in ${REFERENCE_LOCALE}\n`);

  // Find all source files
  const sourceFiles = [];
  for (const dir of SOURCE_DIRS) {
    sourceFiles.push(...findSourceFiles(path.join(BLOG_DIR, dir)));
  }
  console.log(`   Scanning ${sourceFiles.length} source files...\n`);

  // Extract and validate keys
  const usedKeys = new Set();
  const missingKeys = new Map(); // key -> [{file, lines}]
  let totalUsages = 0;

  for (const filePath of sourceFiles) {
    const { keys } = extractKeysFromFile(filePath);
    const relativePath = path.relative(BLOG_DIR, filePath);

    for (const [key, lineNumbers] of keys) {
      totalUsages += lineNumbers.length;
      usedKeys.add(key);

      if (!validKeys.has(key)) {
        if (!missingKeys.has(key)) {
          missingKeys.set(key, []);
        }
        missingKeys.get(key).push({ file: relativePath, lines: lineNumbers });
      }
    }
  }

  // Report missing keys
  let hasErrors = false;

  if (missingKeys.size > 0) {
    hasErrors = true;
    console.log(`❌ Missing translation keys (${missingKeys.size} keys not found in ${REFERENCE_LOCALE}):\n`);

    const sortedKeys = [...missingKeys.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, locations] of sortedKeys) {
      console.log(`   "${key}"`);
      for (const { file, lines } of locations) {
        console.log(`      └─ ${file}:${lines.join(', ')}`);
      }
    }
    console.log('');
  } else {
    console.log(`✅ All ${totalUsages} translation usages reference valid keys\n`);
  }

  // Report unused keys (optional)
  if (showUnused) {
    const unusedKeys = [...validKeys].filter((k) => !usedKeys.has(k));

    if (unusedKeys.length > 0) {
      console.log(`⚠️  Potentially unused translation keys (${unusedKeys.length} keys):\n`);
      console.log('   Note: Some keys may be used dynamically and not detected.\n');

      // Group by top-level namespace
      const grouped = {};
      for (const key of unusedKeys) {
        const namespace = key.split('.')[0];
        if (!grouped[namespace]) {
          grouped[namespace] = [];
        }
        grouped[namespace].push(key);
      }

      for (const [namespace, keys] of Object.entries(grouped)) {
        console.log(`   ${namespace}/ (${keys.length} keys)`);
        keys.slice(0, 5).forEach((k) => console.log(`      - ${k}`));
        if (keys.length > 5) {
          console.log(`      ... and ${keys.length - 5} more`);
        }
      }
      console.log('');
    } else {
      console.log(`✅ All translation keys appear to be used\n`);
    }
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`\n   Total translation keys: ${validKeys.size}`);
  console.log(`   Keys used in code: ${usedKeys.size}`);
  console.log(`   Total usages found: ${totalUsages}`);

  if (hasErrors) {
    console.log(`\n❌ Validation failed! Add missing keys to apps/blog/locales/${REFERENCE_LOCALE}/common_blog.json\n`);
    process.exit(1);
  } else {
    console.log(`\n✅ Translation usage validation passed!\n`);
    process.exit(0);
  }
}

validateTranslationUsage();
