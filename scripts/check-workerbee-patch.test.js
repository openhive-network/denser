const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PATCH_MARKER, classifyBundle, installedWorkerbees, reportWorkerbees } = require('./check-workerbee-patch');

const patchLines = fs
  .readFileSync(path.join(__dirname, '..', 'patches', '@hiveio__workerbee.patch'), 'utf8')
  .split('\n');
const hunkLines = patchLines.slice(patchLines.findIndex((line) => line.startsWith('@@')) + 1);
/** The bundle text the committed patch expects (its context and removed lines). */
const PRE_IMAGE = hunkLines.filter((line) => !line.startsWith('+')).map((line) => line.slice(1)).join('\n');
/** The bundle text the committed patch produces (its context and added lines). */
const POST_IMAGE = hunkLines.filter((line) => !line.startsWith('-')).map((line) => line.slice(1)).join('\n');

test('the committed patch turns a buggy bundle into one the check reads as patched', () => {
  assert.equal(classifyBundle(PRE_IMAGE), 'unfixed');
  assert.equal(classifyBundle(POST_IMAGE), 'patched');
});

test("a build with upstream's rename but without the marker is read as upstream-fixed", () => {
  assert.equal(classifyBundle(POST_IMAGE.replace(PATCH_MARKER, '')), 'upstream-fixed');
});

test('a bundle whose collector code changed beyond recognition is unknown', () => {
  assert.equal(classifyBundle('const collected=await fetchRange();list.concat(collected)'), 'unknown');
});

/** Writes a pnpm-like install: each bundle in node_modules/.pnpm, linked from a workspace of its own. */
const withInstall = (bundles, fn) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workerbee-check-'));
  try {
    Object.entries(bundles).forEach(([version, text], index) => {
      const dir = path.join(root, 'node_modules', '.pnpm', `@hiveio+workerbee@${version}_patch_hash=x`, 'node_modules', '@hiveio', 'workerbee');
      fs.mkdirSync(path.join(dir, 'dist', 'bundle'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version }));
      fs.writeFileSync(path.join(dir, 'dist', 'bundle', 'index.js'), text);
      const link = path.join(root, 'packages', `pkg${index}`, 'node_modules', '@hiveio', 'workerbee');
      fs.mkdirSync(path.dirname(link), { recursive: true });
      fs.symlinkSync(dir, link);
    });
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('a patched install passes with a note naming the version', () => {
  withInstall({ '1.28.4-rc1-stable.261030075154': POST_IMAGE }, (root) => {
    const { errors, notes } = reportWorkerbees(installedWorkerbees(root));
    assert.deepEqual(errors, []);
    assert.match(notes[0], /^@hiveio\/workerbee@1\.28\.4-rc1-stable\.261030075154: .* applied/);
  });
});

test('an upstream-fixed install passes and says to remove the patch', () => {
  withInstall({ '1.28.5-stable.261201000000': POST_IMAGE.replace(PATCH_MARKER, '') }, (root) => {
    const { errors, notes } = reportWorkerbees(installedWorkerbees(root));
    assert.deepEqual(errors, []);
    assert.match(notes[0], /contains upstream's block catch-up fix .* Remove the patch/);
  });
});

test('an install the patch did not apply to fails with re-target instructions', () => {
  withInstall({ '1.28.4-rc1-stable.261030075154': POST_IMAGE, '1.28.4-rc2-stable.261105000000': PRE_IMAGE }, (root) => {
    const { errors, notes } = reportWorkerbees(installedWorkerbees(root));
    assert.equal(notes.length, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^@hiveio\/workerbee@1\.28\.4-rc2-stable\.261105000000 still has the block catch-up bug.*Re-target the patch/);
  });
});

test('an install without workerbee fails', () => {
  withInstall({}, (root) => {
    assert.equal(reportWorkerbees(installedWorkerbees(root)).errors.length, 1);
  });
});

test('a build no workspace links is not checked', () => {
  withInstall({ '1.28.4-rc1-stable.261030075154': POST_IMAGE }, (root) => {
    const stale = path.join(root, 'node_modules', '.pnpm', '@hiveio+workerbee@1.0.0_patch_hash=old', 'node_modules', '@hiveio', 'workerbee');
    fs.mkdirSync(path.join(stale, 'dist', 'bundle'), { recursive: true });
    fs.writeFileSync(path.join(stale, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    fs.writeFileSync(path.join(stale, 'dist', 'bundle', 'index.js'), PRE_IMAGE);
    assert.deepEqual(reportWorkerbees(installedWorkerbees(root)).errors, []);
  });
});
