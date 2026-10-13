// Prints the existing e2e specs (apps/*/playwright/tests/e2e/**/*.spec.ts) that
// are, or import directly or through other modules, one of the repository-relative
// paths read from stdin (one per line; deleted paths count). Used by
// run-live-e2e.sh so a page-object or helper change runs the live specs built on it.
//
// Imports are read lexically and only relative specifiers are followed: the
// Playwright code reaches its page objects, helpers and the shared
// playwright/support only that way, and a bare specifier names a dependency.
import fs from 'node:fs';
import path from 'node:path';

const SCANNED_ROOTS = ['apps', 'playwright'];
const SKIPPED_DIRS = new Set(['node_modules', '.next', 'test-results', 'playwright-report']);
const SOURCE_SUFFIXES = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])(\.{1,2}\/[^'"\n]*)\1/g;
const SPEC_PATTERN = /^apps\/[^/]+\/playwright\/tests\/e2e\/.+\.spec\.ts$/;

function* playwrightSources(dir, insidePlaywright) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const child = path.posix.join(dir, entry.name);
    const inside = insidePlaywright || entry.name === 'playwright';
    if (entry.isDirectory()) yield* playwrightSources(child, inside);
    else if (inside && SOURCE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) yield child;
  }
}

// The candidate files a relative specifier may name: as written, with a source
// suffix appended, or as a directory's index.
function resolutions(importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  return [base, ...SOURCE_SUFFIXES.map((suffix) => base + suffix), ...SOURCE_SUFFIXES.map((suffix) => `${base}/index${suffix}`)];
}

function reverseImports() {
  const importers = new Map();
  for (const root of SCANNED_ROOTS) {
    for (const file of playwrightSources(root, root === 'playwright')) {
      for (const [, , specifier] of fs.readFileSync(file, 'utf8').matchAll(IMPORT_PATTERN)) {
        for (const target of resolutions(file, specifier)) {
          if (!importers.has(target)) importers.set(target, new Set());
          importers.get(target).add(file);
        }
      }
    }
  }
  return importers;
}

const changed = fs.readFileSync(0, 'utf8').split('\n').filter(Boolean);
const importers = reverseImports();
const reached = new Set(changed);
const pending = [...changed];
while (pending.length > 0) {
  for (const importer of importers.get(pending.pop()) ?? []) {
    if (!reached.has(importer)) {
      reached.add(importer);
      pending.push(importer);
    }
  }
}
const specs = [...reached].filter((file) => SPEC_PATTERN.test(file) && fs.existsSync(file)).sort();
if (specs.length > 0) process.stdout.write(`${specs.join('\n')}\n`);
