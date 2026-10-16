const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  catalogBeekeeperVersion,
  lockedBeekeeperVersions,
  findBeekeeperProblems
} = require('./check-beekeeper-lockfile');

const WORKSPACE = `catalogs:
  other:
    '@hiveio/beekeeper': 0.0.1
  hiveio-toolset:
    '@hiveio/wax': 1.0.0
    '@hiveio/beekeeper': 1.28.8-stable.261010131807
    '@hiveio/workerbee': 1.0.0

overrides:
  '@hiveio/beekeeper': 'catalog:hiveio-toolset'
`;

const lockWith = (...versions) =>
  [
    'packages:',
    ...versions.map((v) => `  '@hiveio/beekeeper@${v}':\n    resolution: {integrity: x}`),
    '  \'@hiveio/wax-signers-external@1.0.0\':',
    '    dependencies:',
    `      '@hiveio/beekeeper': ${versions[0] ?? 'none'}`,
    'snapshots:',
    ...versions.map((v) => `  '@hiveio/beekeeper@${v}': {}`)
  ].join('\n');

test('the catalog version is read from the hiveio-toolset catalog, not another one', () => {
  assert.equal(catalogBeekeeperVersion(WORKSPACE), '1.28.8-stable.261010131807');
  assert.equal(catalogBeekeeperVersion('catalogs:\n  hiveio-toolset:\n    \'@hiveio/wax\': 1.0.0\n'), undefined);
});

test('a lockfile resolving only the catalog version passes', () => {
  const locked = lockedBeekeeperVersions(lockWith('1.28.8-stable.261010131807'));
  assert.deepEqual(locked, ['1.28.8-stable.261010131807']);
  assert.deepEqual(findBeekeeperProblems('1.28.8-stable.261010131807', locked), []);
});

test('a second version pinned by a transitive dependency is reported', () => {
  const locked = lockedBeekeeperVersions(lockWith('1.28.6-rc10-stable.260317081625', '1.28.8-stable.261010131807'));
  assert.deepEqual(findBeekeeperProblems('1.28.8-stable.261010131807', locked), [
    "pnpm-lock.yaml resolves @hiveio/beekeeper@1.28.6-rc10-stable.260317081625, not the catalog's 1.28.8-stable.261010131807"
  ]);
});

test('a missing catalog entry or an absent beekeeper is reported', () => {
  assert.equal(findBeekeeperProblems(undefined, ['1.0.0']).length, 1);
  assert.equal(findBeekeeperProblems('1.0.0', []).length, 1);
});

test("the repository's lockfile resolves only the catalog's beekeeper", () => {
  const root = path.join(__dirname, '..');
  const catalogVersion = catalogBeekeeperVersion(fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'));
  const locked = lockedBeekeeperVersions(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'));
  assert.deepEqual(findBeekeeperProblems(catalogVersion, locked), []);
});
