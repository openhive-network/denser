import fs from 'fs';
import path from 'path';
import type { IReplayMiss } from '../mock-server';

/** A replay MISS attributed to the spec file whose test was running. */
export interface IFixtureMiss extends IReplayMiss {
  /** Spec path relative to the fixture test dir, e.g. `homepage.spec.ts` */
  spec: string;
}

interface IMissShardLine {
  spec: string;
  misses: IReplayMiss[];
}

export interface IMissRun {
  /** Specs with at least one passing test attempt in this run */
  specs: Set<string>;
  /** Deduplicated, sorted misses from passing test attempts */
  misses: IFixtureMiss[];
}

export interface IBaselineDiff {
  added: IFixtureMiss[];
  gone: IFixtureMiss[];
}

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'test-results', 'fixture');
const SHARD_DIR = path.join(RESULTS_DIR, 'misses.d');

export const MISSES_FILE = path.join(RESULTS_DIR, 'misses.json');
export const BASELINE_FILE = path.resolve(__dirname, '..', '..', 'fixture', 'known-misses.json');

/**
 * A baseline entry with this hash accepts any params for its spec + method,
 * for calls whose params are random per run (e.g. a noise-prefixed permlink).
 */
const ANY_HASH = '*';

function missKey(miss: IFixtureMiss): string {
  return `${miss.spec}\t${miss.method}\t${miss.hash}`;
}

function anyHashKey(miss: IFixtureMiss): string {
  return missKey({ ...miss, hash: ANY_HASH });
}

function sortedUnique(misses: IFixtureMiss[]): IFixtureMiss[] {
  const byKey = new Map(misses.map(({ spec, method, hash }) => [missKey({ spec, method, hash }), { spec, method, hash }]));
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, miss]) => miss);
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

export function resetMissShards(): void {
  fs.rmSync(SHARD_DIR, { recursive: true, force: true });
  fs.mkdirSync(SHARD_DIR, { recursive: true });
}

/**
 * Records the misses of one passing test attempt. Each worker process
 * appends to its own file, so retries and worker restarts never race.
 */
export function appendMissShard(spec: string, misses: IReplayMiss[]): void {
  const line: IMissShardLine = { spec, misses };
  fs.mkdirSync(SHARD_DIR, { recursive: true });
  fs.appendFileSync(path.join(SHARD_DIR, `worker-${process.pid}.jsonl`), JSON.stringify(line) + '\n');
}

export function readMissRun(): IMissRun {
  const specs = new Set<string>();
  const misses: IFixtureMiss[] = [];
  const files = fs.existsSync(SHARD_DIR) ? fs.readdirSync(SHARD_DIR) : [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(SHARD_DIR, file), 'utf-8').split('\n').filter(Boolean);
    for (const text of lines) {
      const line = JSON.parse(text) as IMissShardLine;
      specs.add(line.spec);
      misses.push(...line.misses.map((m) => ({ spec: line.spec, ...m })));
    }
  }
  return { specs, misses: sortedUnique(misses) };
}

export function writeRunMisses(misses: IFixtureMiss[]): void {
  writeJson(MISSES_FILE, misses);
}

export function readBaseline(): IFixtureMiss[] {
  if (!fs.existsSync(BASELINE_FILE)) return [];
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8')) as IFixtureMiss[];
}

/**
 * Replaces the baseline entries of the specs that ran with the run's misses.
 * Entries of other specs and `*` entries are kept.
 */
export function updateBaseline(baseline: IFixtureMiss[], run: IMissRun): IFixtureMiss[] {
  const kept = baseline.filter((m) => !run.specs.has(m.spec) || m.hash === ANY_HASH);
  const anyHashKeys = new Set(kept.filter((m) => m.hash === ANY_HASH).map(missKey));
  const updated = sortedUnique([...kept, ...run.misses.filter((m) => !anyHashKeys.has(anyHashKey(m)))]);
  writeJson(BASELINE_FILE, updated);
  return updated;
}

/** Compares a run against the baseline entries of the specs that ran. */
export function diffAgainstBaseline(baseline: IFixtureMiss[], run: IMissRun): IBaselineDiff {
  const inScope = baseline.filter((m) => run.specs.has(m.spec));
  const baselineKeys = new Set(inScope.map(missKey));
  const runKeys = new Set([...run.misses.map(missKey), ...run.misses.map(anyHashKey)]);
  return {
    added: run.misses.filter((m) => !baselineKeys.has(missKey(m)) && !baselineKeys.has(anyHashKey(m))),
    gone: inScope.filter((m) => !runKeys.has(missKey(m)))
  };
}

export function formatMisses(misses: IFixtureMiss[]): string {
  return misses.map((m) => `  ${m.spec}  ${m.method}  (hash ${m.hash})`).join('\n');
}
