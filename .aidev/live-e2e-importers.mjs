// Prints the existing e2e specs (apps/*/playwright/tests/e2e/**/*.spec.ts) that
// are, or import directly or through other modules, one of the repository-relative
// paths read from stdin (one per line; deleted paths count). Used by
// run-live-e2e.sh so a page-object or helper change runs the live specs built on it.
//
// The graph is import-graph.mjs's, over the Playwright code only: the sources
// inside a `playwright` directory under apps/, and playwright/.
import fs from 'node:fs';
import { importerClosure, reverseImports, sourceFiles } from './import-graph.mjs';

const SCANNED_ROOTS = ['apps', 'playwright'];
const SPEC_PATTERN = /^apps\/[^/]+\/playwright\/tests\/e2e\/.+\.spec\.ts$/;

const changed = fs.readFileSync(0, 'utf8').split('\n').filter(Boolean);
const importers = reverseImports(SCANNED_ROOTS.flatMap((root) => [...sourceFiles(root, { playwrightOnly: true })]));
const reached = importerClosure(changed, importers);
const specs = [...reached].filter((file) => SPEC_PATTERN.test(file) && fs.existsSync(file)).sort();
if (specs.length > 0) process.stdout.write(`${specs.join('\n')}\n`);
