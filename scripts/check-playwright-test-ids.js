#!/usr/bin/env node
/**
 * Fails when two Playwright test titles of one app start with the same test ID.
 *
 * A title starting with an ID (`CMT-09: …`, `WALLET-PROPOSALS-SEARCH-01: …`) is how
 * specs, `-g` filters, notes and commits name a test, so an ID has to name one test.
 * Parallel changes each picking "the next free number" in a file collide silently.
 *
 * Checked: the first argument of every test(…), test.skip/only/fixme/fail(…) and
 * test.describe(…) (with .serial/.parallel/.skip/.only/.fixme) call in
 * every .ts file under apps/<app>/playwright, when it is a quoted string that starts with an ID
 * (`[A-Z][A-Z0-9-]*-\d+[a-z]?:`).
 *
 * Namespace: per app. Each app's Playwright configs run only its own specs, so a
 * `-g` filter never spans both apps, and the wallet prefixes its own IDs (WALLET-…);
 * the same ID in the blog and in the wallet is allowed.
 *
 * Not checked: titles built from template literals (often one title per loop
 * iteration, its ID varying or not) are listed as skipped; titles passed as a
 * variable are not seen at all.
 *
 * Usage: node scripts/check-playwright-test-ids.js
 */
const fs = require('fs');
const path = require('path');

const TITLE_CALL = /(?<![\w.$])test((?:\.(?:describe|skip|only|fixme|fail|serial|parallel))*)\(\s*(['"`])/g;
const TEST_ID = /^([A-Z][A-Z0-9-]*-\d+[a-z]?):/;
const TEMPLATE_ID_PREFIX = /^[A-Z][A-Z0-9-]*-(?:\d|\$\{)/;

function lineAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === '\n') line++;
  return line;
}

/**
 * The test IDs titles in one file's source start with, and the lines of the
 * template-literal titles that look like they start with one.
 * Returns { ids: [{ id, line }], templateLines: [line] }.
 */
function findTestIds(source) {
  const ids = [];
  const templateLines = [];
  for (const match of source.matchAll(TITLE_CALL)) {
    const quote = match[2];
    const textStart = match.index + match[0].length;
    const text = source.slice(textStart, textStart + 200);
    const line = lineAt(source, textStart);
    if (quote === '`') {
      if (TEMPLATE_ID_PREFIX.test(text)) templateLines.push(line);
      continue;
    }
    const id = text.match(TEST_ID);
    if (id) ids.push({ id: id[1], line });
  }
  return { ids, templateLines };
}

/** The IDs that occur more than once in [{ id, location }], each with all its locations, sorted by ID. */
function findDuplicateIds(entries) {
  const locationsById = new Map();
  for (const { id, location } of entries) {
    if (!locationsById.has(id)) locationsById.set(id, []);
    locationsById.get(id).push(location);
  }
  return [...locationsById]
    .filter(([, locations]) => locations.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, locations]) => ({ id, locations }));
}

function tsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : tsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function main() {
  const root = path.join(__dirname, '..');
  const apps = fs
    .readdirSync(path.join(root, 'apps'))
    .filter((app) => fs.existsSync(path.join(root, 'apps', app, 'playwright')))
    .sort();
  let failed = false;
  for (const app of apps) {
    const entries = [];
    const skipped = [];
    for (const file of tsFiles(path.join(root, 'apps', app, 'playwright')).sort()) {
      const relative = path.relative(root, file);
      const { ids, templateLines } = findTestIds(fs.readFileSync(file, 'utf8'));
      entries.push(...ids.map(({ id, line }) => ({ id, location: `${relative}:${line}` })));
      skipped.push(...templateLines.map((line) => `${relative}:${line}`));
    }
    const duplicates = findDuplicateIds(entries);
    for (const { id, locations } of duplicates) {
      console.error(`apps/${app}: test ID ${id} is used ${locations.length} times:`);
      for (const location of locations) console.error(`  ${location}`);
    }
    if (duplicates.length > 0) failed = true;
    console.log(`apps/${app}: ${entries.length} test IDs, ${duplicates.length} duplicated`);
    if (skipped.length > 0) {
      console.log(`apps/${app}: ${skipped.length} template-literal titles not checked: ${skipped.join(', ')}`);
    }
  }
  if (failed) {
    console.error('Renumber the test you added to the next free number in its prefix, and update references to it.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findTestIds, findDuplicateIds };
