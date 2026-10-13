// Spec selection of run-live-e2e.sh, driven through AIDEV_CHANGED_FILES_FILE.
// Without DENSER_TEST_STACK the script stops after selecting, at "no test stack",
// so it runs nothing and its stderr names what it selected.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E2E = 'apps/blog/playwright/tests/e2e';
const SMOKE_SET = [`${E2E}/mainTimeline.spec.ts`, `${E2E}/postPage.spec.ts`];
const WALLET_E2E = 'apps/wallet/playwright/tests/e2e';
const WALLET_SMOKE_SET = [`${WALLET_E2E}/wallet.spec.ts`];

function select(changedLines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-e2e-select-'));
  const changedFile = path.join(dir, 'changed-files.txt');
  fs.writeFileSync(changedFile, changedLines.map((line) => `${line}\n`).join(''));
  const env = { ...process.env, AIDEV_CHANGED_FILES_FILE: changedFile };
  delete env.DENSER_TEST_STACK;
  const run = spawnSync('bash', ['.aidev/run-live-e2e.sh'], { cwd: repo, env, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(run.status, 0, run.stderr);
  const selected = run.stderr.match(/^live_e2e: selected e2e specs, --repeat-each=(\d+): (.*)$/m);
  const junit = fs.readFileSync(path.join(repo, 'test-results/live-e2e/junit.xml'), 'utf8');
  return {
    specs: selected ? selected[2].split(' ') : [],
    repeatEach: selected ? Number(selected[1]) : undefined,
    junit
  };
}

function importsOf(spec) {
  return fs.readFileSync(path.join(repo, spec), 'utf8');
}

test('a changed page object selects every spec importing it, at the full repeat', () => {
  const { specs, repeatEach } = select(['apps/blog/playwright/tests/support/pages/homePage.ts']);
  assert.ok(specs.includes(`${E2E}/mainTimeline.spec.ts`), specs.join(' '));
  const directImporters = fs
    .readdirSync(path.join(repo, E2E))
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => `${E2E}/${name}`)
    .filter((spec) => /from '\.\.\/support\/pages\/homePage'/.test(importsOf(spec)));
  assert.ok(directImporters.length > 1);
  for (const spec of directImporters) assert.ok(specs.includes(spec), `${spec} not selected`);
  assert.ok(specs.every((spec) => /^apps\/[^/]+\/playwright\/tests\/e2e\/.+\.spec\.ts$/.test(spec)), specs.join(' '));
  assert.equal(repeatEach, 3);
});

test('a shared module reached only through page objects selects their specs', () => {
  const { specs } = select(['playwright/support/timeouts.ts']);
  assert.ok(specs.includes(`${E2E}/mainTimeline.spec.ts`), specs.join(' '));
});

test('a deleted support file still selects the specs importing it', () => {
  const { specs } = select(['D\tapps/blog/playwright/tests/support/locatorSelector.ts']);
  assert.ok(specs.includes(`${E2E}/postPage.spec.ts`), specs.join(' '));
});

test('a changed blog component selects exactly the blog smoke set, once each', () => {
  const { specs, repeatEach } = select(['apps/blog/features/list-of-posts/post-card-comment-tooltip.tsx']);
  assert.deepEqual(specs, SMOKE_SET);
  assert.equal(repeatEach, 1);
});

test('a changed shared package selects every app\'s smoke set', () => {
  const { specs } = select(['packages/ui/components/button.tsx']);
  assert.deepEqual(specs, [...SMOKE_SET, ...WALLET_SMOKE_SET]);
});

test('a changed wallet component selects exactly the wallet smoke set, once each', () => {
  const { specs, repeatEach } = select(['apps/wallet/feature/transfers-page/wallet-balances-table.tsx']);
  assert.deepEqual(specs, WALLET_SMOKE_SET);
  assert.equal(repeatEach, 1);
});

test('a changed wallet spec selects it at the full repeat', () => {
  const { specs, repeatEach } = select([`${WALLET_E2E}/market.spec.ts`]);
  assert.deepEqual(specs, [`${WALLET_E2E}/market.spec.ts`]);
  assert.equal(repeatEach, 3);
});

test('a changed wallet page object selects the wallet specs importing it', () => {
  const { specs, repeatEach } = select(['apps/wallet/playwright/tests/support/pages/walletPage.ts']);
  assert.ok(specs.includes(`${WALLET_E2E}/wallet.spec.ts`), specs.join(' '));
  assert.equal(repeatEach, 3);
});

test('selected wallet specs get past app selection to the stack check', () => {
  const { junit } = select(['apps/wallet/feature/transfers-page/wallet-balances-table.tsx']);
  assert.match(junit, /<skipped message="no test stack \(DENSER_TEST_STACK is not 1\)/);
});

test('a changed spec plus app source runs the union at the full repeat', () => {
  const { specs, repeatEach } = select([`${E2E}/faqPage.spec.ts`, 'apps/blog/app/layout.tsx']);
  assert.deepEqual(specs, [`${E2E}/faqPage.spec.ts`, ...SMOKE_SET]);
  assert.equal(repeatEach, 3);
});

test('a change touching no app or test code is not applicable', () => {
  const { specs, junit } = select(['README.md', '.gitlab-ci.yml', 'apps/wallet/playwright/tests/support/nothing.ts']);
  assert.deepEqual(specs, []);
  assert.match(junit, /<skipped message="the candidate changes no e2e spec, nothing one imports and no app source/);
});
