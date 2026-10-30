import type { IReplayMiss } from '../mock-server';

/** A replay MISS attributed to the spec file whose test was running. */
export interface IFixtureMiss extends IReplayMiss {
  /** Spec path relative to the fixture test dir, e.g. `homepage.spec.ts` */
  spec: string;
}

/** An entry of `known-misses.json`. */
export interface IKnownMiss extends IFixtureMiss {
  /**
   * Why the miss happens in some runs only. Baseline updates keep such an
   * entry, and a run that does not hit it does not report it as gone.
   */
  intermittent?: string;
}

export interface IMissRun {
  /** Specs with at least one passing test attempt in this run */
  specs: Set<string>;
  /** Deduplicated, sorted misses from passing test attempts */
  misses: IFixtureMiss[];
}

export interface IBaselineDiff {
  added: IFixtureMiss[];
  gone: IKnownMiss[];
}

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

/** Entries a baseline update must not drop when the run does not hit them. */
function isPinned(entry: IKnownMiss): boolean {
  return entry.hash === ANY_HASH || entry.intermittent !== undefined;
}

function toEntry({ spec, method, hash, intermittent }: IKnownMiss): IKnownMiss {
  return intermittent === undefined ? { spec, method, hash } : { spec, method, hash, intermittent };
}

/** Misses sorted by spec, method and hash; the first of each key is kept. */
export function sortedUnique<T extends IFixtureMiss>(misses: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const miss of misses) if (!byKey.has(missKey(miss))) byKey.set(missKey(miss), miss);
  return [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, miss]) => miss);
}

/**
 * Replaces the baseline entries of the specs that ran with the run's misses.
 * Entries of other specs, `*` entries and intermittent entries are kept.
 */
export function mergeIntoBaseline(baseline: IKnownMiss[], run: IMissRun): IKnownMiss[] {
  const kept = baseline.filter((m) => !run.specs.has(m.spec) || isPinned(m));
  const keptKeys = new Set(kept.map(missKey));
  return sortedUnique(
    [...kept, ...run.misses.filter((m) => !keptKeys.has(missKey(m)) && !keptKeys.has(anyHashKey(m)))].map(toEntry)
  );
}

/** Compares a run against the baseline entries of the specs that ran. */
export function diffAgainstBaseline(baseline: IKnownMiss[], run: IMissRun): IBaselineDiff {
  const inScope = baseline.filter((m) => run.specs.has(m.spec));
  const baselineKeys = new Set(inScope.map(missKey));
  const runKeys = new Set([...run.misses.map(missKey), ...run.misses.map(anyHashKey)]);
  return {
    added: run.misses.filter((m) => !baselineKeys.has(missKey(m)) && !baselineKeys.has(anyHashKey(m))),
    gone: inScope.filter((m) => m.intermittent === undefined && !runKeys.has(missKey(m)))
  };
}

function formatMiss({ spec, method, hash, params }: IFixtureMiss): string {
  const line = `  ${spec}  ${method}  (hash ${hash})`;
  return params === undefined ? line : `${line}  params ${JSON.stringify(params)}`;
}

export function formatMisses(misses: IFixtureMiss[]): string {
  return misses.map(formatMiss).join('\n');
}

/** The teardown's error for misses the baseline does not list. */
export function newMissesMessage(added: IFixtureMiss[], baselineName: string, missesFile: string): string {
  return (
    `${added.length} new fixture MISS(es): the app made API calls that have no recording ` +
    `and were answered with a JSON-RPC error.\n${formatMisses(added)}\n` +
    `Record the calls (FIXTURE_MODE=record) or, if the miss is intended, add it to ` +
    `${baselineName} (FIXTURE_MISS_BASELINE=update). Full list: ${missesFile}`
  );
}
