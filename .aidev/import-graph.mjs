// The repository's relative-import graph, read lexically: shared by
// live-e2e-importers.mjs (live_e2e's spec selection) and test-map.mjs (the full
// slot's suite and fixture-spec selection).
//
// Relative specifiers are followed, and so are the apps' own tsconfig aliases
// (APP_ALIASES: `@/blog/*`, `@/wallet/*`), which point back into the app. Any
// other tsconfig `paths` alias is not followed: unfollowedAliasTargets names the
// in-repo paths reached through one, for the callers to widen on. A bare specifier
// names a dependency (a workspace package, which the callers treat as reaching
// everything).
import fs from 'node:fs';
import path from 'node:path';

const SKIPPED_DIRS = new Set(['node_modules', '.next', 'test-results', 'playwright-report']);
export const SOURCE_SUFFIXES = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g;
const RELATIVE_SPECIFIER = /^\.{1,2}\//;
const TSCONFIG = /^tsconfig[^/]*\.json$/;
// alias prefix -> the repository directory it names
const APP_ALIASES = new Map([
  ['@/blog/', 'apps/blog/'],
  ['@/wallet/', 'apps/wallet/']
]);

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

function* specifiers(file) {
  for (const [, , specifier] of fs.readFileSync(file, 'utf8').matchAll(IMPORT_PATTERN)) yield specifier;
}

// The repository path a relative or app-alias specifier names; null for any other.
function followedBase(importer, specifier) {
  if (RELATIVE_SPECIFIER.test(specifier)) return path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  for (const [alias, dir] of APP_ALIASES) {
    if (specifier.startsWith(alias)) return path.posix.normalize(dir + specifier.slice(alias.length));
  }
  return null;
}

// The candidate files a followed specifier may name: as written, with a source
// suffix appended, or as a directory's index.
function resolutions(importer, specifier) {
  const base = followedBase(importer, specifier);
  if (base === null) return [];
  return [base, ...SOURCE_SUFFIXES.map((suffix) => base + suffix), ...SOURCE_SUFFIXES.map((suffix) => `${base}/index${suffix}`)];
}

// target path -> the files importing it. A target need not exist, so a deleted
// file keeps its importers.
export function reverseImports(files) {
  const importers = new Map();
  for (const file of files) {
    for (const specifier of specifiers(file)) {
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

function* tsconfigFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (SKIPPED_DIRS.has(entry.name)) continue;
    const child = dir === '.' ? entry.name : path.posix.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir !== '.') yield* tsconfigFiles(child);
    } else if (TSCONFIG.test(entry.name)) {
      yield child;
    }
  }
}

// tsconfig is JSON with comments and trailing commas.
function parseJsonc(text) {
  const stripped = text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match, string) => string ?? '');
  return JSON.parse(stripped.replace(/,(\s*[}\]])/g, '$1'));
}

// Every tsconfig `paths` entry in the root's and `roots`' tsconfig files that the
// graph does not follow (APP_ALIASES): { config, pattern, targets }, the targets
// repository-relative with the `*` dropped.
function unfollowedAliases(roots) {
  const aliases = [];
  for (const config of [...tsconfigFiles('.'), ...roots.flatMap((root) => [...tsconfigFiles(root)])]) {
    const options = parseJsonc(fs.readFileSync(config, 'utf8')).compilerOptions ?? {};
    const baseDir = path.posix.join(path.posix.dirname(config), options.baseUrl ?? '.');
    for (const [pattern, targets] of Object.entries(options.paths ?? {})) {
      const resolved = targets.map((target) => path.posix.normalize(path.posix.join(baseDir, target.replace(/\*.*$/, ''))));
      const prefix = pattern.replace(/\*.*$/, '');
      const followed = pattern.endsWith('/*') && APP_ALIASES.has(prefix) && resolved.every((target) => target === APP_ALIASES.get(prefix));
      if (!followed) aliases.push({ config, pattern, targets: resolved });
    }
  }
  return aliases;
}

function aliasMatches(pattern, specifier) {
  const star = pattern.indexOf('*');
  if (star < 0) return specifier === pattern;
  return specifier.startsWith(pattern.slice(0, star)) && specifier.endsWith(pattern.slice(star + 1));
}

// In-repo path prefix -> why: the targets of the tsconfig aliases (from the tsconfig
// files under `tsconfigRoots`) that one of `files` imports through and the graph does
// not follow. A changed path starting with one may have importers the graph misses.
export function unfollowedAliasTargets(files, tsconfigRoots) {
  const aliases = unfollowedAliases(tsconfigRoots);
  const targets = new Map();
  if (aliases.length === 0) return targets;
  for (const file of files) {
    for (const specifier of specifiers(file)) {
      for (const { config, pattern, targets: aliasTargets } of aliases) {
        if (!aliasMatches(pattern, specifier)) continue;
        for (const target of aliasTargets) {
          if (!targets.has(target)) targets.set(target, `${file} imports '${specifier}' through ${config}'s '${pattern}', which the import graph does not follow`);
        }
      }
    }
  }
  return targets;
}
