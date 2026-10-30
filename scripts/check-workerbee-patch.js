#!/usr/bin/env node
/**
 * Fails when an installed @hiveio/workerbee bundle still has the BlockCollector
 * catch-up bug (patches/README.md): `const { blocks } = await get_block_range(...)`
 * shadows the outer list, so `blocks.push(...blocks)` pushes the fetched blocks
 * into themselves and the bot stops analyzing transactions after a late poll.
 *
 * package.json patches workerbee by name, so the patch follows whatever version
 * the ccc catalog resolves. When a new build's code no longer matches the patch,
 * pnpm only warns and installs it unpatched; this check, run after every install,
 * tells which case that is:
 *   - the patch's marker is in the bundle: the backport is in effect;
 *   - `fetchedBlocks` without the marker: the build has upstream's fix, so the
 *     patch is no longer needed (logged, not failed);
 *   - `blocks.push(...blocks)`, or neither: the bug may be back, fail.
 *
 * Usage: node scripts/check-workerbee-patch.js
 */
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = '@hiveio/workerbee';
const PATCH_FILE = 'patches/@hiveio__workerbee.patch';
const PATCH_MARKER = '/*denser:workerbee-5eab2cad*/';
const BUGGY_CODE = 'blocks.push(...blocks)';
const FIXED_NAME = 'fetchedBlocks';
const BUNDLE_PATH = path.join('dist', 'bundle', 'index.js');

/** 'patched', 'upstream-fixed', 'unfixed' or 'unknown' for the bundle's text. */
function classifyBundle(bundleText) {
  if (bundleText.includes(PATCH_MARKER)) return 'patched';
  if (bundleText.includes(BUGGY_CODE)) return 'unfixed';
  if (bundleText.includes(FIXED_NAME)) return 'upstream-fixed';
  return 'unknown';
}

/** Directories of root and its apps/* and packages/* workspaces. */
function workspaceDirs(root) {
  const nested = ['apps', 'packages'].flatMap((group) => {
    const dir = path.join(root, group);
    return fs.existsSync(dir) ? fs.readdirSync(dir).map((name) => path.join(dir, name)) : [];
  });
  return [root, ...nested];
}

/**
 * { version, bundleText } of every workerbee a workspace under root links. Only
 * linked copies count: node_modules/.pnpm keeps builds of an earlier patch hash.
 */
function installedWorkerbees(root) {
  const dirs = new Set(
    workspaceDirs(root)
      .map((dir) => path.join(dir, 'node_modules', PACKAGE_NAME))
      .filter((dir) => fs.existsSync(path.join(dir, BUNDLE_PATH)))
      .map((dir) => fs.realpathSync(dir))
  );
  return [...dirs].map((dir) => ({
    version: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version,
    bundleText: fs.readFileSync(path.join(dir, BUNDLE_PATH), 'utf8')
  }));
}

/** { errors, notes } for the installed workerbees. */
function reportWorkerbees(installed) {
  if (installed.length === 0) {
    return { errors: [`no workspace links ${PACKAGE_NAME}; run pnpm install first`], notes: [] };
  }
  const errors = [];
  const notes = [];
  for (const { version, bundleText } of installed) {
    const name = `${PACKAGE_NAME}@${version}`;
    switch (classifyBundle(bundleText)) {
      case 'patched':
        notes.push(`${name}: ${PATCH_FILE} applied, the block catch-up fix is in effect`);
        break;
      case 'upstream-fixed':
        notes.push(
          `${name} contains upstream's block catch-up fix (workerbee 5eab2cad), so pnpm could not apply ${PATCH_FILE}. ` +
            `Remove the patch: delete ${PATCH_FILE}, its package.json pnpm.patchedDependencies entry and ` +
            'scripts/check-workerbee-patch.js with its CI and .aidev/pnpm-deps.sh calls, then refresh pnpm-lock.yaml.'
        );
        break;
      case 'unfixed':
        errors.push(
          `${name} still has the block catch-up bug (\`${BUGGY_CODE}\` in ${BUNDLE_PATH}) and ${PATCH_FILE} did not apply to it ` +
            '(pnpm warned "Could not apply patch"). Re-target the patch: `pnpm patch @hiveio/workerbee@<version>`, ' +
            `rename the destructured \`blocks\` of get_block_range to \`${FIXED_NAME}\` with the ${PATCH_MARKER} marker ` +
            `as in ${PATCH_FILE}, then \`pnpm patch-commit\` and move the result back to ${PATCH_FILE} with package.json's key by name only.`
        );
        break;
      default:
        errors.push(
          `${name}: neither the patch marker, \`${BUGGY_CODE}\` nor \`${FIXED_NAME}\` is in ${BUNDLE_PATH}, ` +
            'so this check cannot tell whether BlockCollector.get still has the catch-up bug. Read it in that bundle, ' +
            `then re-target ${PATCH_FILE} or remove it (patches/README.md) and update this check.`
        );
    }
  }
  return { errors, notes };
}

function main() {
  const { errors, notes } = reportWorkerbees(installedWorkerbees(path.join(__dirname, '..')));
  for (const note of notes) console.log(note);
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { PATCH_MARKER, classifyBundle, installedWorkerbees, reportWorkerbees };
