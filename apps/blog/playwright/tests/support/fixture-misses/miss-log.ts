import fs from 'fs';
import path from 'path';
import type { IReplayMiss } from '../mock-server';
import { mergeIntoBaseline, sortedUnique, type IFixtureMiss, type IKnownMiss, type IMissRun } from './known-misses';

interface IMissShardLine {
  spec: string;
  misses: IReplayMiss[];
}

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');
const RESULTS_DIR = path.join(REPO_ROOT, 'test-results', 'fixture');
const SHARD_DIR = path.join(RESULTS_DIR, 'misses.d');

export const MISSES_FILE = path.join(RESULTS_DIR, 'misses.json');
export const BASELINE_FILE = path.resolve(__dirname, '..', '..', 'fixture', 'known-misses.json');

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

export function readBaseline(): IKnownMiss[] {
  if (!fs.existsSync(BASELINE_FILE)) return [];
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8')) as IKnownMiss[];
}

/** Writes the baseline {@link mergeIntoBaseline} makes of the run. */
export function updateBaseline(baseline: IKnownMiss[], run: IMissRun): IKnownMiss[] {
  const updated = mergeIntoBaseline(baseline, run);
  writeJson(BASELINE_FILE, updated);
  return updated;
}
