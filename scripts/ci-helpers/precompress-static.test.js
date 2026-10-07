const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

const load = () => import('../precompress-static.mjs');

function tree(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'precompress-'));
  for (const [name, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), data);
  }
  return dir;
}

const script = 'export const a = "denser";\n'.repeat(200);

test('writes br and zst sidecars that decode to the original, and keeps the original', async () => {
  const { precompressDir } = await load();
  const dir = tree({ 'chunks/app.js': script, 'media/wax.wasm': Buffer.alloc(4096, 7) });
  const totals = await precompressDir(dir);

  for (const name of ['chunks/app.js', 'media/wax.wasm']) {
    const original = fs.readFileSync(path.join(dir, name));
    assert.deepEqual(zlib.brotliDecompressSync(fs.readFileSync(path.join(dir, `${name}.br`))), original);
    assert.deepEqual(zlib.zstdDecompressSync(fs.readFileSync(path.join(dir, `${name}.zst`))), original);
  }
  assert.equal(totals.files, 2);
  assert.equal(totals.raw, script.length + 4096);
  assert.ok(totals.br < totals.raw / 10, `br ${totals.br} of ${totals.raw}`);
});

test('leaves incompressible types, tiny files and incompressible data without sidecars', async () => {
  const { precompressDir } = await load();
  const random = require('node:crypto').randomBytes(8192);
  const dir = tree({ 'media/logo.png': script, 'chunks/tiny.js': 'x', 'chunks/random.js': random, 'chunks/random.js.br': 'stale' });
  await precompressDir(dir);

  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
  assert.deepEqual(files, ['chunks/random.js', 'chunks/tiny.js', 'media/logo.png']);
});

test('rejects a missing directory', async () => {
  const { precompressDir } = await load();
  await assert.rejects(precompressDir(path.join(os.tmpdir(), 'precompress-missing-dir')), { code: 'ENOENT' });
});
