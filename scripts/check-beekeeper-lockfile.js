#!/usr/bin/env node
/**
 * Fails when pnpm-lock.yaml resolves @hiveio/beekeeper to anything but the single
 * version of the `hiveio-toolset` catalog in pnpm-workspace.yaml.
 *
 * Beekeeper runs on the page as well as in hb-auth's worker, and the production
 * script-src has no 'unsafe-eval': an older build whose embind glue calls
 * new Function breaks every on-page beekeeper (e.g. Google Drive sign-in). A
 * wax signer pinning its own beekeeper silently brings such a build back, so the
 * workspace overrides it; this check keeps the override effective.
 *
 * Usage: node scripts/check-beekeeper-lockfile.js
 */
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = '@hiveio/beekeeper';
const CATALOG_NAME = 'hiveio-toolset';

/** The catalog's beekeeper version from pnpm-workspace.yaml text, or undefined. */
function catalogBeekeeperVersion(workspaceYaml) {
  const lines = workspaceYaml.split('\n');
  const start = lines.findIndex((line) => line.trim().replace(/["']/g, '') === `${CATALOG_NAME}:`);
  if (start === -1) return undefined;
  const indent = lines[start].search(/\S/);
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (line.search(/\S/) <= indent) break;
    const match = line.match(/^\s*["']?@hiveio\/beekeeper["']?:\s*["']?([^"'\s#]+)["']?/);
    if (match) return match[1];
  }
  return undefined;
}

/** Every @hiveio/beekeeper version pnpm-lock.yaml text resolves, sorted. */
function lockedBeekeeperVersions(lockYaml) {
  const versions = new Set();
  for (const match of lockYaml.matchAll(/^ {2}'?@hiveio\/beekeeper@([^'(:\s]+)/gm)) {
    versions.add(match[1]);
  }
  return [...versions].sort();
}

/** Problem messages for the locked versions against the catalog version; empty when in line. */
function findBeekeeperProblems(catalogVersion, lockedVersions) {
  if (!catalogVersion) return [`no ${PACKAGE_NAME} in the ${CATALOG_NAME} catalog of pnpm-workspace.yaml`];
  if (lockedVersions.length === 0) return [`pnpm-lock.yaml resolves no ${PACKAGE_NAME}`];
  return lockedVersions
    .filter((version) => version !== catalogVersion)
    .map((version) => `pnpm-lock.yaml resolves ${PACKAGE_NAME}@${version}, not the catalog's ${catalogVersion}`);
}

function main() {
  const root = path.join(__dirname, '..');
  const catalogVersion = catalogBeekeeperVersion(fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  const lockedVersions = lockedBeekeeperVersions(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  const problems = findBeekeeperProblems(catalogVersion, lockedVersions);
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error(`Override ${PACKAGE_NAME} to catalog:${CATALOG_NAME} in pnpm-workspace.yaml and re-resolve the lockfile.`);
    process.exit(1);
  }
  console.log(`pnpm-lock.yaml resolves only ${PACKAGE_NAME}@${catalogVersion}`);
}

if (require.main === module) {
  main();
}

module.exports = { catalogBeekeeperVersion, lockedBeekeeperVersions, findBeekeeperProblems };
