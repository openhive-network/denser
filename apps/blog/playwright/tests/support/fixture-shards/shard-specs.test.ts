import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { listSpecs, readDurations, shardFromEnv, specsForShard } from './shard-specs.ts';

const FIXTURE_DIR = path.join(import.meta.dirname, '..', '..', 'fixture');
const DURATIONS_FILE = path.join(import.meta.dirname, 'durations.json');

void describe('shardFromEnv', () => {
  void it('runs unsharded without the variables or with a total of 1', () => {
    assert.equal(shardFromEnv(undefined, undefined), undefined);
    assert.equal(shardFromEnv('1', '1'), undefined);
  });

  void it('reads GitLab parallel variables', () => {
    assert.deepEqual(shardFromEnv('3', '4'), { current: 3, total: 4 });
  });

  void it('refuses a value that is not a shard', () => {
    assert.throws(() => shardFromEnv('0', '4'), /not a shard/);
    assert.throws(() => shardFromEnv('5', '4'), /not a shard/);
    assert.throws(() => shardFromEnv('1', undefined), /not a shard/);
    assert.throws(() => shardFromEnv('x', '4'), /not a shard/);
  });
});

void describe('specsForShard', () => {
  const shards = (specs: string[], durations: Record<string, number>, total: number) =>
    Array.from({ length: total }, (_, i) => specsForShard(specs, durations, { current: i + 1, total }));

  void it('balances by duration, not by file count', () => {
    const durations = { 'a.spec.ts': 60, 'b.spec.ts': 20, 'c.spec.ts': 20, 'd.spec.ts': 20 };

    assert.deepEqual(shards(Object.keys(durations), durations, 2), [
      ['a.spec.ts'],
      ['b.spec.ts', 'c.spec.ts', 'd.spec.ts']
    ]);
  });

  void it('weighs a spec without a recorded duration as the median one', () => {
    const durations = { 'a.spec.ts': 10, 'b.spec.ts': 30, 'c.spec.ts': 50 };

    assert.deepEqual(shards([...Object.keys(durations), 'new.spec.ts'], durations, 2), [
      ['a.spec.ts', 'c.spec.ts'],
      ['b.spec.ts', 'new.spec.ts']
    ]);
  });

  void it('puts every committed spec in exactly one of 4 shards', () => {
    const specs = listSpecs(FIXTURE_DIR);
    const all = shards(specs, readDurations(DURATIONS_FILE), 4).flat();

    assert.ok(specs.length > 0);
    assert.deepEqual([...all].sort(), specs);
  });
});
