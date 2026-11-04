// image-input-hash.sh against the Dockerfile: every file the image build copies
// from the checkout must change the reuse hash of both apps, and every input the
// script lists must exist. Runs the script in a throwaway git repository holding a
// stand-in for each input, so it needs no history of this checkout.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '../..');
const SCRIPT = 'scripts/ci-helpers/image-input-hash.sh';
const APPS = ['apps/blog', 'apps/wallet'];
const REAL_FILES = ['Dockerfile', 'docker-bake.hcl', SCRIPT];

function listedInputs() {
  const source = fs.readFileSync(path.join(ROOT, SCRIPT), 'utf8');
  const block = source.match(/^INPUTS=\(\n([\s\S]*?)^\)/m);
  assert.ok(block, `no INPUTS=( ... ) array in ${SCRIPT}`);
  return block[1].split(/\s+/).filter(Boolean);
}

// Checkout paths the Dockerfile copies: from the build context, and from the
// builder stage's /app (its `COPY . .`) other than turbo prune's out/.
function copiedPaths() {
  const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
  const paths = [];
  for (const line of dockerfile.split('\n')) {
    const words = line.trim().split(/\s+/);
    if (words[0] !== 'COPY') continue;
    const from = words.find((w) => w.startsWith('--from='));
    const sources = words.slice(1, -1).filter((w) => !w.startsWith('--'));
    for (const source of sources) {
      if (!from && source !== '.') paths.push(source.replace(/^\.\//, ''));
      if (from === '--from=builder' && source.startsWith('/app/') && !source.startsWith('/app/out/')) {
        paths.push(source.slice('/app/'.length));
      }
    }
  }
  return paths;
}

function git(repo, ...args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function write(repo, name, data) {
  fs.mkdirSync(path.dirname(path.join(repo, name)), { recursive: true });
  fs.writeFileSync(path.join(repo, name), data);
}

function fixtureRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'image-input-hash-'));
  git(repo, 'init', '-q');
  for (const input of listedInputs()) {
    if (input === '"$APP_PATH"') continue;
    const real = path.join(ROOT, input);
    if (!fs.existsSync(real)) continue;
    write(repo, fs.statSync(real).isDirectory() ? `${input}/stand-in` : input, `stand-in for ${input}\n`);
  }
  for (const app of APPS) write(repo, `${app}/package.json`, '{}\n');
  for (const name of REAL_FILES) fs.copyFileSync(path.join(ROOT, name), path.join(repo, name));
  fs.chmodSync(path.join(repo, SCRIPT), 0o755);
  commit(repo);
  return repo;
}

function commit(repo) {
  git(repo, 'add', '-A');
  git(repo, '-c', 'user.name=test', '-c', 'user.email=test@localhost', 'commit', '-q', '-m', 'inputs');
}

function hashes(repo) {
  return APPS.map((app) =>
    execFileSync(path.join(repo, SCRIPT), [app], { cwd: repo, encoding: 'utf8', env: { PATH: process.env.PATH } }).trim()
  );
}

test('every input the script lists exists in the checkout', () => {
  const missing = listedInputs()
    .filter((input) => input !== '"$APP_PATH"')
    .filter((input) => !fs.existsSync(path.join(ROOT, input)));
  assert.deepEqual(missing, []);
});

test('the Dockerfile copies the files the image build runs from the checkout', () => {
  const copied = copiedPaths();
  assert.ok(copied.includes('docker/docker-entrypoint.sh'), copied.join(', '));
  assert.ok(copied.includes('scripts/precompress-static.mjs'), copied.join(', '));
});

test('an edit to any file the Dockerfile copies changes the hash of both apps', () => {
  const repo = fixtureRepo();
  try {
    for (const copied of copiedPaths()) {
      const before = hashes(repo);
      const isDir = fs.existsSync(path.join(ROOT, copied)) && fs.statSync(path.join(ROOT, copied)).isDirectory();
      const file = isDir ? `${copied}/stand-in` : copied;
      write(repo, file, `edited ${file} ${Date.now()}\n`);
      commit(repo);
      const after = hashes(repo);
      APPS.forEach((app, i) => assert.notEqual(after[i], before[i], `${copied} is not in ${SCRIPT}'s INPUTS (${app})`));
    }
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('the hash fails when a listed input no longer exists', () => {
  const repo = fixtureRepo();
  try {
    git(repo, 'rm', '-q', 'scripts/precompress-static.mjs');
    commit(repo);
    assert.throws(
      () => execFileSync(path.join(repo, SCRIPT), ['apps/blog'], { cwd: repo, stdio: 'pipe' }),
      (error) => error.status !== 0 && /precompress-static\.mjs/.test(String(error.stderr))
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
