// The full slot's fixture_e2e shards (.aidev/project.yaml, run-fixture-e2e.sh): every
// spec runs in exactly one shard only if the entries are shards 1..n of one n, and a
// shard's evidence reaches AIDEV only from the directory its script writes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The entries of the full slot's `suites:` list, as name and the entry's own text. */
function fullSuites() {
  const profile = fs.readFileSync(path.join(repo, '.aidev/project.yaml'), 'utf8');
  const full = profile.slice(profile.indexOf('\n  full:\n'), profile.indexOf('\n  baseline:\n'));
  return full
    .split(/\n {6}- name: /)
    .slice(1)
    .map((entry) => ({ name: entry.slice(0, entry.indexOf('\n')).trim(), text: entry }));
}

function shardEntries() {
  return fullSuites().flatMap(({ name, text }) => {
    const shard = text.match(/DENSER_FIXTURE_SHARD: "(\d+)\/(\d+)"/);
    return shard ? [{ name, text, index: Number(shard[1]), total: Number(shard[2]) }] : [];
  });
}

test('the shards are 1..n of one n, fixture_e2e the first', () => {
  const shards = shardEntries();
  assert.ok(shards.length > 0, 'no suite of the full slot sets DENSER_FIXTURE_SHARD');
  const total = shards[0].total;
  assert.deepEqual(
    shards.map((shard) => `${shard.index}/${shard.total}`).sort(),
    Array.from({ length: total }, (_, i) => `${i + 1}/${total}`).sort()
  );
  assert.equal(shards.find((shard) => shard.index === 1).name, 'fixture_e2e');
});

test('a later shard is concurrent and declares the directory it writes', () => {
  for (const shard of shardEntries().filter(({ index }) => index > 1)) {
    const dir = `test-results/fixture-shard-${shard.index}/`;
    assert.equal(shard.name, `fixture_e2e_shard_${shard.index}`);
    assert.match(shard.text, /\n\s+concurrent: true\n/, shard.name);
    assert.ok(shard.text.includes(`artifacts: ["${dir}"]`), `${shard.name} declares artifacts ${dir}`);
    assert.ok(shard.text.includes(`{path: ${dir}playwright.json, format: playwright-json}`), shard.name);
    // A changed spec is repeated by fixture_e2e alone, not once per shard.
    assert.doesNotMatch(shard.text, /\n\s+files: /, shard.name);
  }
});

test('a shard selector that is not k/n with 1 <= k <= n is refused before anything runs', () => {
  for (const selector of ['0/3', '4/3', '2', 'a/b', '1/0']) {
    const run = spawnSync('bash', ['.aidev/run-fixture-e2e.sh'], {
      cwd: repo,
      env: { ...process.env, DENSER_FIXTURE_SHARD: selector },
      encoding: 'utf8'
    });
    assert.equal(run.status, 2, `${selector}: ${run.stderr}`);
    assert.match(run.stderr, /is not <k>\/<n>/);
  }
});
