// Cheap check that node_modules is the install pnpm-lock.yaml describes, run by
// .aidev/pnpm-deps.sh after its marker matches: for every app, `next` and `react`
// must resolve from the app's directory at the version the lockfile gives that
// importer, with their bins linked in the app's node_modules/.bin. A matching
// marker over a half-linked tree (a stale `next` resolved from elsewhere) fails it.
//
// Run from the repository root. Exit 0 when consistent; otherwise exit 1 and name
// each mismatch on stderr.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const CHECKED_DEPS = new Set(['next', 'react']);
const DEP_SECTIONS = new Set(['dependencies:', 'devDependencies:', 'optionalDependencies:']);

// The importers section of a lockfile v9, read by indentation: "  <importer>:",
// "    <section>:", "      <dep>:", "        version: <version>(<peers>)".
function lockedAppVersions(lockfile) {
  const apps = new Map();
  let inImporters = false;
  let app = null;
  let inSection = false;
  let dep = null;
  for (const line of lockfile.split('\n')) {
    if (line.trim() === '') continue;
    if (!line.startsWith(' ')) {
      if (inImporters) break;
      inImporters = line === 'importers:';
      continue;
    }
    if (!inImporters) continue;
    const indent = line.length - line.trimStart().length;
    const text = line.trim();
    if (indent === 2) {
      const name = text.replace(/:.*$/, '');
      app = name.startsWith('apps/') ? name : null;
      if (app) apps.set(app, new Map());
      inSection = false;
    } else if (indent === 4) {
      inSection = DEP_SECTIONS.has(text);
    } else if (indent === 6) {
      dep = text.replace(/:$/, '');
    } else if (indent === 8 && app && inSection && CHECKED_DEPS.has(dep) && text.startsWith('version: ')) {
      apps.get(app).set(dep, text.slice('version: '.length).replace(/\(.*$/, ''));
    }
  }
  return apps;
}

// Node's lookup of a bare specifier, without package exports: the nearest
// node_modules/<dep> from appDir upwards.
function resolvedPackageJson(appDir, dep) {
  for (let dir = resolve(appDir); ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', dep, 'package.json');
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) return null;
  }
}

function mismatches(app, deps) {
  const found = [];
  for (const [dep, locked] of deps) {
    const pkgJson = resolvedPackageJson(app, dep);
    if (!pkgJson) {
      found.push(`${app}: ${dep} does not resolve (lockfile: ${locked})`);
      continue;
    }
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
    if (pkg.version !== locked) {
      found.push(`${app}: ${dep} resolves to ${pkg.version} (lockfile: ${locked})`);
    }
    const bins = typeof pkg.bin === 'string' ? [dep] : Object.keys(pkg.bin ?? {});
    for (const bin of bins) {
      if (!existsSync(join(app, 'node_modules', '.bin', bin))) {
        found.push(`${app}: node_modules/.bin/${bin} is missing`);
      }
    }
  }
  return found;
}

const problems = [];
for (const [app, deps] of lockedAppVersions(readFileSync('pnpm-lock.yaml', 'utf8'))) {
  problems.push(...mismatches(app, deps));
}
for (const problem of problems) console.error(`node_modules out of date: ${problem}`);
process.exit(problems.length ? 1 : 0);
