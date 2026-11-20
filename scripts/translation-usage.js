/**
 * Translation usage validator, shared by the blog, the wallet, packages/smart-signer and
 * packages/ui (scripts/check-*-translation-usage.js): every literal key passed to t('key') or
 * <Trans i18nKey="key"> in the scanned sources must exist in one of the English reference files
 * the code can resolve it in. With --unused it also lists reference keys no source names.
 *
 * Keys built at run time (t(`a.${b}`), t(prefix + 'x')) cannot be checked and are skipped.
 * Unit test files are not scanned: their t() calls name keys of their own fixtures.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const TEST_FILE = /\.test\.[jt]sx?$/;
const PLURAL_OTHER_SUFFIX = '_other';

// Matches: t('key'), t("key"), t(`key`), <Trans i18nKey="key">
const TRANSLATION_PATTERNS = [/\bt\(\s*['"`]([^'"`\n]+?)['"`]\s*(?:,|\))/g, /i18nKey\s*=\s*['"`]([^'"`\n]+?)['"`]/g];

/**
 * The dotted keys of a locale object. i18next resolves t('base', { count }) to the plural forms
 * `base_one`, `base_other`, ..., so a key with an `_other` form also counts under its base name.
 * @param {object} messages
 * @returns {Set<string>}
 */
function collectKeys(messages) {
  const keys = new Set();
  const walk = (obj, prefix) => {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        walk(value, fullKey);
        continue;
      }
      keys.add(fullKey);
      if (fullKey.endsWith(PLURAL_OTHER_SUFFIX)) keys.add(fullKey.slice(0, -PLURAL_OTHER_SUFFIX.length));
    }
  };
  walk(messages, '');
  return keys;
}

/**
 * The literal translation keys a source text names, each with the 1-based lines it is on.
 * @param {string} content
 * @returns {Map<string, number[]>}
 */
function extractKeys(content) {
  const keys = new Map();
  content.split('\n').forEach((line, index) => {
    for (const pattern of TRANSLATION_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];
        if (key.includes('${') || key.includes('{') || key.includes('+')) continue;
        if (!keys.has(key)) keys.set(key, []);
        keys.get(key).push(index + 1);
      }
    }
  });
  return keys;
}

/**
 * Checks the keys `sources` name against `validKeys`.
 * @param {{ file: string, content: string }[]} sources
 * @param {Set<string>} validKeys
 * @returns {{ missing: Map<string, { file: string, lines: number[] }[]>, used: Set<string>, usages: number }}
 */
function checkUsage(sources, validKeys) {
  const missing = new Map();
  const used = new Set();
  let usages = 0;
  for (const { file, content } of sources) {
    for (const [key, lines] of extractKeys(content)) {
      usages += lines.length;
      used.add(key);
      if (validKeys.has(key)) continue;
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push({ file, lines });
    }
  }
  return { missing, used, usages };
}

function findSourceFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name.startsWith('.') || entry.name === 'node_modules' ? [] : findSourceFiles(fullPath);
    }
    const isSource = SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !TEST_FILE.test(entry.name);
    return isSource ? [fullPath] : [];
  });
}

function loadReferenceKeys(referenceFiles) {
  const keys = new Set();
  for (const file of referenceFiles) {
    if (!fs.existsSync(file)) {
      console.error(`Reference locale file not found: ${file}`);
      process.exit(1);
    }
    collectKeys(JSON.parse(fs.readFileSync(file, 'utf8'))).forEach((key) => keys.add(key));
  }
  return keys;
}

function reportUnused(validKeys, used) {
  const unused = [...validKeys].filter((key) => !used.has(key));
  if (unused.length === 0) {
    console.log(`✅ All translation keys appear to be used\n`);
    return;
  }
  console.log(`⚠️  Potentially unused translation keys (${unused.length} keys):\n`);
  console.log('   Note: Some keys may be used dynamically and not detected.\n');
  const grouped = {};
  for (const key of unused) (grouped[key.split('.')[0]] ??= []).push(key);
  for (const [namespace, keys] of Object.entries(grouped)) {
    console.log(`   ${namespace}/ (${keys.length} keys)`);
    keys.slice(0, 5).forEach((key) => console.log(`      - ${key}`));
    if (keys.length > 5) console.log(`      ... and ${keys.length - 5} more`);
  }
  console.log('');
}

/**
 * Runs the check for one code base and exits 1 when a used key is missing.
 * @param {{ name: string, rootDir: string, sourceDirs: string[], referenceFiles: string[], fixHint: string }} target
 *   sourceDirs are relative to rootDir; referenceFiles are the English locale files the code's
 *   t() can resolve keys in; fixHint says where a missing key belongs.
 */
function validateTranslationUsage({ name, rootDir, sourceDirs, referenceFiles, fixHint }) {
  const showUnused = process.argv.includes('--unused');

  console.log(`\n📋 Translation Usage Validator (${name})`);
  console.log(`   Reference: ${referenceFiles.map((file) => path.relative(process.cwd(), file)).join(', ')}`);
  console.log(`   Scanning: ${sourceDirs.join(', ')}\n`);

  const validKeys = loadReferenceKeys(referenceFiles);
  const sources = sourceDirs
    .flatMap((dir) => findSourceFiles(path.join(rootDir, dir)))
    .map((file) => ({ file: path.relative(rootDir, file), content: fs.readFileSync(file, 'utf8') }));
  console.log(`   Found ${validKeys.size} translation keys; scanning ${sources.length} source files...\n`);

  const { missing, used, usages } = checkUsage(sources, validKeys);

  if (missing.size > 0) {
    console.log(`❌ Missing translation keys (${missing.size} keys not found in the reference):\n`);
    for (const [key, locations] of [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`   "${key}"`);
      for (const { file, lines } of locations) console.log(`      └─ ${file}:${lines.join(', ')}`);
    }
    console.log('');
  } else {
    console.log(`✅ All ${usages} translation usages reference valid keys\n`);
  }

  if (showUnused) reportUnused(validKeys, used);

  console.log('─'.repeat(50));
  console.log(`\n   Total translation keys: ${validKeys.size}`);
  console.log(`   Keys used in code: ${used.size}`);
  console.log(`   Total usages found: ${usages}`);

  if (missing.size > 0) {
    console.log(`\n❌ Validation failed! ${fixHint}\n`);
    process.exit(1);
  }
  console.log(`\n✅ Translation usage validation passed!\n`);
}

module.exports = { collectKeys, extractKeys, checkUsage, validateTranslationUsage };
