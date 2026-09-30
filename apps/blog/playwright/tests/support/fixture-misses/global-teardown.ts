import path from 'path';
import {
  BASELINE_FILE,
  MISSES_FILE,
  diffAgainstBaseline,
  formatMisses,
  readBaseline,
  readMissRun,
  updateBaseline,
  writeRunMisses
} from './miss-log';

const UPDATE_BASELINE = process.env.FIXTURE_MISS_BASELINE === 'update';

/**
 * Fails the run when a replay MISS is not listed in `known-misses.json`.
 * Only the specs that ran are compared, so a narrowed run is judged
 * against its own slice of the baseline.
 */
export default function globalTeardown(): void {
  if (process.env.FIXTURE_MODE === 'record') return;

  const run = readMissRun();
  if (run.specs.size === 0) return;
  writeRunMisses(run.misses);

  const baseline = readBaseline();
  const baselineName = path.relative(process.cwd(), BASELINE_FILE);

  if (UPDATE_BASELINE) {
    const updated = updateBaseline(baseline, run);
    console.log(`[fixture-misses] Wrote ${updated.length} known misses to ${baselineName}`);
    return;
  }

  const { added, gone } = diffAgainstBaseline(baseline, run);
  if (gone.length > 0) {
    console.warn(
      `[fixture-misses] ${gone.length} known miss(es) no longer happen — shrink ${baselineName} ` +
        `(FIXTURE_MISS_BASELINE=update):\n${formatMisses(gone)}`
    );
  }
  if (added.length > 0) {
    throw new Error(
      `${added.length} new fixture MISS(es): the app made API calls that have no recording ` +
        `and were answered with a JSON-RPC error.\n${formatMisses(added)}\n` +
        `Record the calls (FIXTURE_MODE=record) or, if the miss is intended, add it to ` +
        `${baselineName} (FIXTURE_MISS_BASELINE=update). Full list: ${MISSES_FILE}`
    );
  }
}
