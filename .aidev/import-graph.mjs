// The repository's relative-import graph, read lexically: shared by
// live-e2e-importers.mjs (live_e2e's spec selection) and test-map.mjs (the full
// slot's suite and fixture-spec selection).
//
// Only relative specifiers are followed: the Playwright code reaches its page
// objects, helpers and the shared playwright/support only that way, and a bare
// specifier names a dependency (a workspace package, which the callers treat as
// reaching everything).
import fs from 'node:fs';
import path from 'node:path';

const SKIPPED_DIRS = new Set(['node_modules', '.next', 'test-results', 'playwright-report']);
export const SOURCE_SUFFIXES = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])(\.{1,2}\/[^'"\n]*)\1/g;

export function isSource(file) {
  return SOURCE_SUFFIXES.some((suffix) => file.endsWith(suffix));
}

// The source files under `dir` (repository-relative); with `playwrightOnly`,
// only those inside a `playwright` directory (or under `dir` when it is one).
export function* sourceFiles(dir, { playwrightOnly = false } = {}) {
  yield* walk(dir, !playwrightOnly || path.posix.basename(dir) === 'playwright', playwrightOnly);
}

function* walk(dir, inside, playwrightOnly) {
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
    const childInside = inside || (playwrightOnly && entry.name === 'playwright');
    if (entry.isDirectory()) yield* walk(child, childInside, playwrightOnly);
    else if (childInside && isSource(entry.name)) yield child;
  }
}

// The candidate files a relative specifier may name: as written, with a source
// suffix appended, or as a directory's index.
function resolutions(importer, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  return [base, ...SOURCE_SUFFIXES.map((suffix) => base + suffix), ...SOURCE_SUFFIXES.map((suffix) => `${base}/index${suffix}`)];
}

// target path -> the files importing it. A target need not exist, so a deleted
// file keeps its importers.
export function reverseImports(files) {
  const importers = new Map();
  for (const file of files) {
    for (const [, , specifier] of fs.readFileSync(file, 'utf8').matchAll(IMPORT_PATTERN)) {
      for (const target of resolutions(file, specifier)) {
        if (!importers.has(target)) importers.set(target, new Set());
        importers.get(target).add(file);
      }
    }
  }
  return importers;
}

// `paths` plus every file importing one of them, directly or through other modules.
export function importerClosure(paths, importers) {
  const reached = new Set(paths);
  const pending = [...paths];
  while (pending.length > 0) {
    for (const importer of importers.get(pending.pop()) ?? []) {
      if (!reached.has(importer)) {
        reached.add(importer);
        pending.push(importer);
      }
    }
  }
  return reached;
}
