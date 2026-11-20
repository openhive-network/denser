/**
 * Translation usage validator, shared by the blog, the wallet, packages/smart-signer and
 * packages/ui (scripts/check-*-translation-usage.js): every literal key passed to t('key') or
 * <Trans i18nKey="key"> in the scanned sources must resolve in every app that renders them. Each
 * renderer lists the English files of the namespaces the code's t() can resolve keys in there (its
 * own, and the namespace i18next falls back to); a shared package has one renderer per app, so a
 * blog-only key used by a component the wallet renders fails. A call naming its namespace with a
 * literal (t('key', { ns: 'common_blog' }), <Trans ns="common_blog">) is checked only in the
 * renderers that load that namespace. With --unused it also lists reference keys no source names.
 *
 * A key with plural forms (`key_one`, `key_few`, `key_other`, ...) must be called with a `count`
 * option, which picks the form: t('key', { count }) or <Trans i18nKey="key" count={n}>. A call whose
 * options are not an object literal (t('key', options)) cannot be checked and passes; in an object
 * literal only a `count` property counts, not a value read from one ({ value: item.count }).
 *
 * Keys built at run time (t(`a.${b}`), t(prefix + 'x')) cannot be checked and are skipped.
 * Unit test files are not scanned: their t() calls name keys of their own fixtures.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const TEST_FILE = /\.test\.[jt]sx?$/;
const PLURAL_OTHER_SUFFIX = '_other';
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
// A `count` property of an object literal: { count }, { count: n }, { ...rest, 'count': n }.
const COUNT_PROPERTY = /[{,]\s*(['"]?)count\1\s*[:,}]/;
// The count={n} attribute of a <Trans>.
const COUNT_ATTRIBUTE = /\scount\s*=/;
// A namespace named by a literal: { ns: 'common_blog' } in t()'s options, ns="common_blog" on a <Trans>.
const NS_OPTION = /[{,]\s*ns\s*:\s*(['"])([^'"\n]+)\1/;
const NS_ATTRIBUTE = /\sns\s*=\s*\{?\s*(['"])([^'"\n]+)\1/;

// t('key' and <Trans ... i18nKey="key", with where the call's arguments or the tag's attributes start.
const PLURAL_CALL_PATTERNS = [
  /\bt\(\s*(['"`])([^'"`\n]+?)\1/g,
  /<Trans\b[^>]*?i18nKey\s*=\s*(['"`])([^'"`\n]+?)\1/g
];

// Matches: t('key'), t("key"), t(`key`), <Trans i18nKey="key">; the second group is the key.
const TRANSLATION_PATTERNS = [
  /\bt\(\s*(['"`])([^'"`\n]+?)\1\s*(?=,|\))/g,
  /i18nKey\s*=\s*(['"`])([^'"`\n]+?)\1/g
];

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
 * The literal translation keys a source text names, each with its 1-based line and the namespace
 * the call names with a literal, if any.
 * @param {string} content
 * @returns {{ key: string, line: number, ns: string | undefined }[]}
 */
function extractKeyUsages(content) {
  const usages = [];
  TRANSLATION_PATTERNS.forEach((pattern, index) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[2];
      if (key.includes('${') || key.includes('{') || key.includes('+')) continue;
      const line = content.slice(0, match.index).split('\n').length;
      usages.push({ key, line, ns: namedNamespace(content, match, index === 1) });
    }
  });
  return usages.sort((a, b) => a.line - b.line);
}

/**
 * The literal translation keys a source text names, each with the 1-based lines it is on.
 * @param {string} content
 * @returns {Map<string, number[]>}
 */
function extractKeys(content) {
  const keys = new Map();
  for (const { key, line } of extractKeyUsages(content)) {
    if (!keys.has(key)) keys.set(key, []);
    keys.get(key).push(line);
  }
  return keys;
}

/**
 * The end of the bracketed text starting at `start` (just past an opening bracket): the index of the
 * closing bracket at depth 0, or of `close` there. Quoted strings are skipped.
 * @param {string} content
 * @param {number} start
 * @param {string} close
 * @returns {number}
 */
function closingIndex(content, start, close) {
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    if (char === "'" || char === '"' || char === '`') {
      const end = content.indexOf(char, i + 1);
      if (end === -1) return content.length;
      i = end;
    } else if ('([{'.includes(char)) depth++;
    else if (depth === 0 && char === close) return i;
    else if (')]}'.includes(char)) depth--;
  }
  return content.length;
}

/**
 * The text of a call's arguments after the key, or of a <Trans>'s attributes.
 * @param {string} rest the text after the key: `, { count })` or (for a <Trans>) ` count={n} />`
 * @param {boolean} isTrans
 * @returns {string}
 */
function callRest(rest, isTrans) {
  if (isTrans) return rest.slice(0, closingIndex(rest, 0, '>'));
  return rest.slice(0, closingIndex(rest, 0, ')')).replace(/^\s*,?\s*/, '');
}

/**
 * Whether the arguments of a t() call, or the attributes of a <Trans>, give a `count`: false only
 * when they certainly do not (no options, or an object literal without a `count` property).
 * @param {string} rest the text after the key: `, { count })` or ` count={n} />`
 * @param {boolean} isTrans
 * @returns {boolean}
 */
function givesCount(rest, isTrans) {
  const args = callRest(rest, isTrans);
  if (isTrans) return COUNT_ATTRIBUTE.test(args) || COUNT_PROPERTY.test(args);
  if (args === '') return false;
  return !args.startsWith('{') || COUNT_PROPERTY.test(args);
}

/**
 * The namespace a t() call or <Trans> names with a literal, after the key `match` found.
 * @param {string} content
 * @param {RegExpExecArray} match
 * @param {boolean} isTrans
 * @returns {string | undefined}
 */
function namedNamespace(content, match, isTrans) {
  if (isTrans) {
    const tagStart = content.lastIndexOf('<', match.index);
    const attributes = callRest(content.slice(tagStart + 1), true);
    return attributes.match(NS_ATTRIBUTE)?.[2];
  }
  return callRest(content.slice(match.index + match[0].length), false).match(NS_OPTION)?.[2];
}

/**
 * The literal keys of a source text that have plural forms in `pluralBases` but are called without
 * a `count`, each with the 1-based lines it is on.
 * @param {string} content
 * @param {Set<string>} pluralBases keys whose `_other` form exists
 * @returns {Map<string, number[]>}
 */
function extractPluralKeysWithoutCount(content, pluralBases) {
  const found = new Map();
  PLURAL_CALL_PATTERNS.forEach((pattern, index) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[2];
      if (!pluralBases.has(key.replace(PLURAL_SUFFIX, ''))) continue;
      const start = match.index + match[0].length;
      const rest = index === 1 ? content.slice(match.index + '<Trans'.length) : content.slice(start);
      if (givesCount(rest, index === 1)) continue;
      const line = content.slice(0, match.index).split('\n').length;
      if (!found.has(key)) found.set(key, []);
      found.get(key).push(line);
    }
  });
  return found;
}

/** Every reference key of the renderers. */
const allKeys = (renderers) =>
  new Set(renderers.flatMap((renderer) => [...renderer.namespaces.values()].flatMap((keys) => [...keys])));

/**
 * The renderers a usage must resolve in: those loading the namespace it names, else all of them.
 * @param {{ ns: string | undefined }} usage
 * @param {{ name: string, namespaces: Map<string, Set<string>> }[]} renderers
 */
const renderersFor = (usage, renderers) =>
  usage.ns === undefined ? renderers : renderers.filter((renderer) => renderer.namespaces.has(usage.ns));

/**
 * Whether a renderer resolves `key`: i18next looks in the named namespace and falls back to the
 * app's own, so a key of any of its namespaces does.
 */
const resolves = (renderer, key) => [...renderer.namespaces.values()].some((keys) => keys.has(key));

/**
 * Checks the keys `sources` name against the reference keys of each renderer.
 * @param {{ file: string, content: string }[]} sources
 * @param {{ name: string, namespaces: Map<string, Set<string>> }[]} renderers each app that renders
 *   the sources, with the keys of each namespace its t() can resolve them in
 * @returns {{ missing: Map<string, { file: string, lines: number[], renderers: string[] }[]>, withoutCount: Map<string, { file: string, lines: number[] }[]>, used: Set<string>, usages: number }}
 */
function checkUsage(sources, renderers) {
  const missing = new Map();
  const withoutCount = new Map();
  const pluralBases = new Set(
    [...allKeys(renderers)]
      .filter((key) => key.endsWith(PLURAL_OTHER_SUFFIX))
      .map((key) => key.slice(0, -PLURAL_OTHER_SUFFIX.length))
  );
  const used = new Set();
  let usages = 0;
  for (const { file, content } of sources) {
    for (const [key, lines] of extractPluralKeysWithoutCount(content, pluralBases)) {
      if (!withoutCount.has(key)) withoutCount.set(key, []);
      withoutCount.get(key).push({ file, lines });
    }
    const missingHere = new Map();
    for (const usage of extractKeyUsages(content)) {
      usages++;
      used.add(usage.key);
      const applicable = renderersFor(usage, renderers);
      const lacking =
        applicable.length === 0 ? renderers : applicable.filter((renderer) => !resolves(renderer, usage.key));
      if (lacking.length === 0) continue;
      const names = lacking.map((renderer) => renderer.name);
      const id = `${usage.key}\0${names.join(',')}`;
      if (!missingHere.has(id))
        missingHere.set(id, { key: usage.key, location: { file, lines: [], renderers: names } });
      missingHere.get(id).location.lines.push(usage.line);
    }
    for (const { key, location } of missingHere.values()) {
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(location);
    }
  }
  return { missing, withoutCount, used, usages };
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

function loadKeys(file) {
  if (!fs.existsSync(file)) {
    console.error(`Reference locale file not found: ${file}`);
    process.exit(1);
  }
  return collectKeys(JSON.parse(fs.readFileSync(file, 'utf8')));
}

function loadRenderers(renderers) {
  return renderers.map(({ name, namespaces }) => ({
    name,
    namespaces: new Map(Object.entries(namespaces).map(([ns, file]) => [ns, loadKeys(file)]))
  }));
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
 * @param {{ name: string, rootDir: string, sourceDirs: string[], renderers: { name: string, namespaces: Record<string, string> }[], fixHint: string }} target
 *   sourceDirs are relative to rootDir; renderers are the apps that render the code, each with the
 *   English locale file of every namespace its t() can resolve keys in there; fixHint says where a
 *   missing key belongs.
 */
function validateTranslationUsage({ name, rootDir, sourceDirs, renderers: rendererFiles, fixHint }) {
  const showUnused = process.argv.includes('--unused');

  console.log(`\n📋 Translation Usage Validator (${name})`);
  for (const renderer of rendererFiles) {
    const files = Object.values(renderer.namespaces).map((file) => path.relative(process.cwd(), file));
    console.log(`   Reference (${renderer.name}): ${files.join(', ')}`);
  }
  console.log(`   Scanning: ${sourceDirs.join(', ')}\n`);

  const renderers = loadRenderers(rendererFiles);
  const validKeys = allKeys(renderers);
  const sources = sourceDirs
    .flatMap((dir) => findSourceFiles(path.join(rootDir, dir)))
    .map((file) => ({ file: path.relative(rootDir, file), content: fs.readFileSync(file, 'utf8') }));
  console.log(`   Found ${validKeys.size} translation keys; scanning ${sources.length} source files...\n`);

  const { missing, withoutCount, used, usages } = checkUsage(sources, renderers);

  if (missing.size > 0) {
    console.log(
      `❌ Missing translation keys (${missing.size} keys not found in the reference of an app that renders them):\n`
    );
    for (const [key, locations] of [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`   "${key}"`);
      for (const { file, lines, renderers: lacking } of locations) {
        console.log(`      └─ ${file}:${lines.join(', ')} (missing in ${lacking.join(', ')})`);
      }
    }
    console.log('');
  } else {
    console.log(`✅ All ${usages} translation usages reference valid keys\n`);
  }

  if (withoutCount.size > 0) {
    console.log(
      `❌ Plural keys called without a count (${withoutCount.size} keys): pass { count } to pick the form\n`
    );
    for (const [key, locations] of [...withoutCount.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`   "${key}"`);
      for (const { file, lines } of locations) console.log(`      └─ ${file}:${lines.join(', ')}`);
    }
    console.log('');
  }

  if (showUnused) reportUnused(validKeys, used);

  console.log('─'.repeat(50));
  console.log(`\n   Total translation keys: ${validKeys.size}`);
  console.log(`   Keys used in code: ${used.size}`);
  console.log(`   Total usages found: ${usages}`);

  if (missing.size > 0 || withoutCount.size > 0) {
    console.log(`\n❌ Validation failed! ${missing.size > 0 ? fixHint : ''}\n`);
    process.exit(1);
  }
  console.log(`\n✅ Translation usage validation passed!\n`);
}

module.exports = {
  collectKeys,
  extractKeys,
  extractKeyUsages,
  extractPluralKeysWithoutCount,
  checkUsage,
  validateTranslationUsage
};
