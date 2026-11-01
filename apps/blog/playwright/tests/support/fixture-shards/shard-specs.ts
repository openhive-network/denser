import fs from 'fs';

/** One of `total` shards, 1-based as GitLab's CI_NODE_INDEX. */
export interface IShard {
  current: number;
  total: number;
}

/** Seconds each spec file's tests took, by spec file name. */
export type SpecDurations = Record<string, number>;

/**
 * The shard GitLab's `parallel:` gives a job (CI_NODE_INDEX, CI_NODE_TOTAL),
 * or undefined for an unsharded run: neither set, or a total of 1. Throws on
 * any other value, which would otherwise run the whole suite in every shard.
 */
export function shardFromEnv(index: string | undefined, total: string | undefined): IShard | undefined {
  if (index === undefined && total === undefined) return undefined;
  const current = Number(index);
  const count = Number(total);
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(current) || current < 1 || current > count) {
    throw new Error(`CI_NODE_INDEX=${index} CI_NODE_TOTAL=${total} is not a shard (1 <= index <= total)`);
  }
  return count === 1 ? undefined : { current, total: count };
}

function median(values: number[]): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The spec files of `shard`. Whole files only, so a file's tests stay in the
 * order its recordings were made in. Each file goes, longest first, to the
 * shard with the least recorded time so far; a file without a recorded
 * duration counts as the median one. Every file lands in exactly one shard,
 * whatever `durations` holds: stale durations cost balance, never coverage.
 */
export function specsForShard(specs: string[], durations: SpecDurations, shard: IShard): string[] {
  const fallback = median(specs.flatMap((spec) => (spec in durations ? [durations[spec]] : [])));
  const weight = (spec: string) => durations[spec] ?? fallback;
  const byWeight = [...specs].sort((a, b) => weight(b) - weight(a) || (a < b ? -1 : a > b ? 1 : 0));
  const loads: number[] = Array.from({ length: shard.total }, () => 0);
  const assigned: string[][] = loads.map(() => []);
  for (const spec of byWeight) {
    const lightest = loads.indexOf(Math.min(...loads));
    loads[lightest] += weight(spec);
    assigned[lightest].push(spec);
  }
  return assigned[shard.current - 1].sort();
}

/** The `*.spec.ts` files directly in `testDir`. */
export function listSpecs(testDir: string): string[] {
  return fs
    .readdirSync(testDir)
    .filter((name) => name.endsWith('.spec.ts'))
    .sort();
}

export function readDurations(file: string): SpecDurations {
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as SpecDurations;
}
