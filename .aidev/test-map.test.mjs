// The full slot's change-to-tests map (.aidev/test-map.mjs), driven as AIDEV's gate
// drives a suite's `select:`: through AIDEV_CHANGED_FILES_FILE, reading the exit
// status (0 runs, 77 skips) and the last output line (the skip's reason).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_SUITES = ['fixture_e2e', 'fixture_e2e_shard_2', 'fixture_e2e_shard_3'];
const SUITES = [...BLOG_SUITES, 'wallet_fixture', 'lighthouse_fixture'];
const FIXTURE = 'apps/blog/playwright/tests/fixture';
const SKIP = 77;

function testMap(args, changedLines, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-map-'));
  const env = { ...process.env, ...extraEnv };
  delete env.AIDEV_CHANGED_FILES_FILE;
  if (changedLines !== null) {
    env.AIDEV_CHANGED_FILES_FILE = path.join(dir, 'changed-files.txt');
    fs.writeFileSync(env.AIDEV_CHANGED_FILES_FILE, changedLines.map((line) => `${line}\n`).join(''));
  }
  const run = spawnSync('node', [path.join(repo, '.aidev/test-map.mjs'), ...args], { cwd: os.tmpdir(), env, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return run;
}

// suite -> its select's exit status
function selected(changedLines) {
  return Object.fromEntries(SUITES.map((suite) => [suite, testMap(['select', suite], changedLines).status]));
}

function specs(changedLines) {
  const run = testMap(['specs'], changedLines);
  assert.equal(run.status, 0, run.stderr);
  return run.stdout.split('\n').filter(Boolean);
}

function everyFixtureSpec() {
  return fs
    .readdirSync(path.join(repo, FIXTURE))
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => `playwright/tests/fixture/${name}`)
    .sort();
}

// The fixture specs whose source matches `pattern`, relative to apps/blog.
function fixtureSpecsMatching(pattern) {
  return everyFixtureSpec().filter((spec) => pattern.test(fs.readFileSync(path.join(repo, 'apps/blog', spec), 'utf8')));
}

function assertEverything(changedLines) {
  assert.deepEqual(selected(changedLines), Object.fromEntries(SUITES.map((suite) => [suite, 0])));
  assert.deepEqual(specs(changedLines), everyFixtureSpec());
}

test('a wallet-only source change skips the blog fixture suites and runs wallet_fixture', () => {
  const change = ['apps/wallet/feature/transfers-page/wallet-balances-table.tsx'];
  assert.deepEqual(selected(change), {
    fixture_e2e: SKIP,
    fixture_e2e_shard_2: SKIP,
    fixture_e2e_shard_3: SKIP,
    wallet_fixture: 0,
    lighthouse_fixture: 0
  });
  assert.deepEqual(specs(change), []);
});

test('a skip names its reason on its last output line', () => {
  const run = testMap(['select', 'fixture_e2e'], ['apps/wallet/feature/transfers-page/wallet-balances-table.tsx']);
  assert.equal(run.status, SKIP);
  const last = run.stdout.trim().split('\n').at(-1);
  assert.match(last, /^not selected: none of the 1 changed paths \(AIDEV_CHANGED_FILES_FILE\) reaches fixture_e2e$/);
});

test('a blog-only source change skips wallet_fixture and runs every fixture spec', () => {
  const change = ['apps/blog/features/list-of-posts/post-card-comment-tooltip.tsx'];
  assert.deepEqual(selected(change), {
    fixture_e2e: 0,
    fixture_e2e_shard_2: 0,
    fixture_e2e_shard_3: 0,
    wallet_fixture: SKIP,
    lighthouse_fixture: 0
  });
  assert.deepEqual(specs(change), everyFixtureSpec());
});

test('a changed fixture spec selects exactly that spec and no app-build-only suite', () => {
  const change = [`${FIXTURE}/faqDhf.spec.ts`];
  assert.deepEqual(specs(change), ['playwright/tests/fixture/faqDhf.spec.ts']);
  const status = selected(change);
  for (const suite of BLOG_SUITES) assert.equal(status[suite], 0, suite);
  assert.equal(status.wallet_fixture, SKIP);
  assert.equal(status.lighthouse_fixture, SKIP);
});

test('a blog support module selects the fixture specs importing it, and the wallet suite whose specs import it', () => {
  const change = ['apps/blog/playwright/tests/support/csp.ts'];
  const listed = specs(change);
  const direct = fixtureSpecsMatching(/from '\.\.\/support\/csp'/);
  assert.ok(direct.length > 0);
  for (const spec of direct) assert.ok(listed.includes(spec), `${spec} not listed`);
  assert.ok(listed.length < everyFixtureSpec().length, listed.join(' '));
  const status = selected(change);
  assert.equal(status.wallet_fixture, 0);
  assert.equal(status.lighthouse_fixture, SKIP);
});

test('a deleted support module still selects the specs importing it', () => {
  const listed = specs(['D\tapps/blog/playwright/tests/support/csp.ts']);
  for (const spec of fixtureSpecsMatching(/from '\.\.\/support\/csp'/)) assert.ok(listed.includes(spec), `${spec} not listed`);
});

test('a support module only live e2e specs import selects the build live_e2e serves them, and no fixture spec', () => {
  const change = ['apps/blog/playwright/tests/support/commentsTestHelper.ts'];
  assert.deepEqual(fixtureSpecsMatching(/support\/commentsTestHelper'/), []);
  assert.deepEqual(specs(change), []);
  assert.deepEqual(selected(change), {
    fixture_e2e: 0,
    fixture_e2e_shard_2: 0,
    fixture_e2e_shard_3: 0,
    wallet_fixture: SKIP,
    lighthouse_fixture: SKIP
  });
});

test('a changed wallet live e2e spec selects wallet_fixture, whose build live_e2e serves', () => {
  assert.equal(testMap(['select', 'wallet_fixture'], ['apps/wallet/playwright/tests/e2e/market.spec.ts']).status, 0);
  assert.equal(testMap(['select', 'fixture_e2e'], ['apps/wallet/playwright/tests/e2e/market.spec.ts']).status, SKIP);
});

test('a blog recording selects the specs naming its set, not the Lighthouse pass', () => {
  const change = ['apps/blog/playwright/tests/mock/fixtures/postDetail/_index.json'];
  const naming = fixtureSpecsMatching(/fixtureTestName: 'postDetail'/);
  assert.ok(naming.length > 0);
  const listed = specs(change);
  for (const spec of naming) assert.ok(listed.includes(spec), `${spec} not listed`);
  assert.ok(listed.length < everyFixtureSpec().length);
  const status = selected(change);
  assert.equal(status.lighthouse_fixture, SKIP);
  assert.equal(status.wallet_fixture, SKIP);
});

test('the recording the Lighthouse pass replays selects it alone', () => {
  const script = fs.readFileSync(path.join(repo, '.aidev/run-lighthouse-fixture.sh'), 'utf8');
  assert.match(script, /^set_name=\$\{DENSER_LIGHTHOUSE_FIXTURE_SET:-lighthouse\}$/m);
  assert.deepEqual(selected(['apps/blog/playwright/tests/mock/fixtures/lighthouse/images/x.webp']), {
    fixture_e2e: SKIP,
    fixture_e2e_shard_2: SKIP,
    fixture_e2e_shard_3: SKIP,
    wallet_fixture: SKIP,
    lighthouse_fixture: 0
  });
});

test('a recording no Playwright code names selects everything', () => {
  assertEverything(['apps/blog/playwright/tests/mock/fixtures/noSuchRecordingSet/0001-x.json']);
});

test('a spec snapshot selects its spec', () => {
  assert.deepEqual(specs([`${FIXTURE}/postEmbedTableLayout.spec.ts-snapshots/table-chromium-linux.png`]), [
    'playwright/tests/fixture/postEmbedTableLayout.spec.ts'
  ]);
});

test('a global setup the fixture config loads by string path runs every fixture spec', () => {
  const change = ['apps/blog/playwright/tests/support/fixture-misses/global-setup.ts'];
  assert.deepEqual(specs(change), everyFixtureSpec());
  assert.equal(selected(change).wallet_fixture, SKIP);
});

test('Playwright code nothing loads by import or config path selects everything', () => {
  assertEverything(['apps/blog/playwright/tests/support/fixture-shards/durations-from-reports.ts']);
});

test('Playwright data selects what the code naming it reaches', () => {
  const change = ['apps/blog/playwright/tests/fixture/known-misses.json'];
  assert.deepEqual(specs(change), everyFixtureSpec());
  assert.equal(selected(change).wallet_fixture, SKIP);
});

test('Playwright data no code names selects everything', () => {
  assertEverything(['apps/blog/playwright/tests/support/noSuchData.json']);
});

test('the fixture proxy the Lighthouse pass loads selects it', () => {
  assert.equal(testMap(['select', 'lighthouse_fixture'], ['apps/blog/playwright/tests/support/mock-server/fixture-proxy.ts']).status, 0);
});

test('wallet Playwright code selects only wallet_fixture', () => {
  assert.deepEqual(selected(['apps/wallet/playwright/tests/support/recordedApi.ts']), {
    fixture_e2e: SKIP,
    fixture_e2e_shard_2: SKIP,
    fixture_e2e_shard_3: SKIP,
    wallet_fixture: 0,
    lighthouse_fixture: SKIP
  });
});

for (const shared of ['packages/ui/components/button.tsx', 'pnpm-lock.yaml', 'package.json', '.aidev/run-fixture-e2e.sh', 'scripts/precompress-static.mjs', 'some/unknown/path.txt']) {
  test(`${shared} selects every suite and every spec`, () => {
    assertEverything([shared]);
  });
}

test('one unclassifiable path among narrow ones still selects everything', () => {
  assertEverything(['apps/wallet/feature/transfers-page/wallet-balances-table.tsx', 'packages/transaction/index.ts']);
});

test('an empty change selects everything', () => {
  assertEverything([]);
});

test('a docs-only change selects none of the mapped suites', () => {
  const change = ['docs/decisions/0001-x.md', 'README.md', 'apps/blog/playwright/tests/fixture/CLAUDE.md'];
  assert.deepEqual(selected(change), Object.fromEntries(SUITES.map((suite) => [suite, SKIP])));
});

test('a base git cannot resolve is a select failure, which runs the suite', () => {
  const run = testMap(['select', 'wallet_fixture'], null, { AIDEV_BASE_REF: 'refs/heads/no-such-branch-for-test-map' });
  assert.notEqual(run.status, 0);
  assert.notEqual(run.status, SKIP);
});

test('a suite the map has no rule for is a select failure, which runs it', () => {
  const run = testMap(['select', 'unit'], ['apps/wallet/lib/x.ts']);
  assert.notEqual(run.status, 0);
  assert.notEqual(run.status, SKIP);
});

test('the plan prints the invocation that runs exactly the selected specs', () => {
  const run = testMap(['plan'], [`${FIXTURE}/faqDhf.spec.ts`]);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^run: aidev test run --slot full --suite fixture_e2e -- playwright\/tests\/fixture\/faqDhf\.spec\.ts$/m);
});

test('project.yaml binds each mapped suite to its select', () => {
  const profile = fs.readFileSync(path.join(repo, '.aidev/project.yaml'), 'utf8');
  const full = profile.slice(profile.indexOf('\n  full:\n'), profile.indexOf('\n  baseline:\n'));
  for (const suite of SUITES) {
    const start = full.indexOf(`- name: ${suite}\n`);
    assert.ok(start >= 0, `${suite} not in the full slot`);
    const next = full.indexOf('- name: ', start + 1);
    const entry = full.slice(start, next < 0 ? undefined : next);
    assert.ok(entry.includes(`select: ["node", ".aidev/test-map.mjs", "select", "${suite}"]`), `${suite} has no test-map select`);
  }
});
