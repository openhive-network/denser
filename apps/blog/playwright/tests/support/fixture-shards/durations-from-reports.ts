/**
 * Prints durations.json from Playwright JSON reports of the fixture suite:
 * the seconds every attempt of each spec file's tests took. Pass the reports
 * of all blog-fixture-tests shards (junit/fixture/results.json of each job):
 *
 *   node playwright/tests/support/fixture-shards/durations-from-reports.ts \
 *     results-1.json results-2.json results-3.json results-4.json \
 *     > playwright/tests/support/fixture-shards/durations.json
 */
import fs from 'fs';

interface IReportSuite {
  file: string;
  specs?: { tests: { results: { duration: number }[] }[] }[];
  suites?: IReportSuite[];
}

function suiteMs(suite: IReportSuite): number {
  const own = (suite.specs ?? [])
    .flatMap((spec) => spec.tests)
    .flatMap((test) => test.results)
    .reduce((sum, result) => sum + result.duration, 0);
  return (suite.suites ?? []).reduce((sum, child) => sum + suiteMs(child), own);
}

const durations: Record<string, number> = {};
for (const report of process.argv.slice(2)) {
  const { suites } = JSON.parse(fs.readFileSync(report, 'utf-8')) as { suites: IReportSuite[] };
  for (const suite of suites) {
    durations[suite.file] = (durations[suite.file] ?? 0) + Math.round(suiteMs(suite) / 100) / 10;
  }
}
const sorted = Object.fromEntries(Object.entries(durations).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
process.stdout.write(JSON.stringify(sorted, null, 2) + '\n');
