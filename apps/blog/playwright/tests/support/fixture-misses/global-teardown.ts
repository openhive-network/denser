import path from 'path';
import { diffAgainstBaseline, formatMisses, newMissesMessage } from './known-misses';
import { BASELINE_FILE, MISSES_FILE, readBaseline, readMissRun, updateBaseline, writeRunMisses } from './miss-log';

const UPDATE_BASELINE = process.env.FIXTURE_MISS_BASELINE === 'update';

/**
 * Fails the run when a replay MISS is not listed in `known-misses.json`.
 * Only the specs that ran are compared, so a narrowed run is judged
 * against its own slice of the baseline. A known miss that does not happen
 * is only warned about; an `intermittent` one is not reported at all.
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
        `(FIXTURE_MISS_BASELINE=update), or mark one that happens in some runs only ` +
        `\`intermittent\`:\n${formatMisses(gone)}`
    );
  }
  if (added.length > 0) {
    throw new Error(newMissesMessage(added, baselineName, MISSES_FILE));
  }
}
