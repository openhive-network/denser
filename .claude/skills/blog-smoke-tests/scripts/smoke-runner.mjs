#!/usr/bin/env node
/**
 * Smoke Test Runner
 * Runs all smoke tests and generates report without requiring jq
 * Replaces bash+jq logic in CI pipeline
 */
import { spawn } from 'child_process';
import { mkdir, writeFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration from environment
const config = {
  BASE_URL: process.env.BASE_URL || 'https://blog.openhive.network',
  HEADLESS: process.env.HEADLESS || 'true',
  REPORT_DIR: process.env.REPORT_DIR || './playwright/smoke-report',
  API_URL: process.env.API_URL || 'https://api.hive.blog'
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

// All smoke tests in order
const TESTS = [
  'smoke-01-homepage-posts.mjs',
  'smoke-02-votes-tooltip.mjs',
  'smoke-03-payout-tooltip.mjs',
  'smoke-04-post-navigation.mjs',
  'smoke-05-votes-api.mjs',
  'smoke-06-comments.mjs',
  'smoke-07-payout.mjs',
  'smoke-08-profile.mjs',
  'smoke-09-followers.mjs',
  'smoke-10-tags.mjs',
  'smoke-11-categories.mjs',
  'smoke-12-communities.mjs',
  'smoke-13-static-pages.mjs',
  'smoke-14-theme.mjs',
  'smoke-15-login.mjs',
  'smoke-16-search.mjs',
  'smoke-17-mobile.mjs',
  'smoke-18-error-handling.mjs',
  'smoke-19-sidebar.mjs',
  'smoke-20-keyboard-nav.mjs'
];

/**
 * Runs a single test and captures its output
 * @param {string} testFile - Test filename
 * @param {string} scriptsDir - Directory containing test scripts
 * @returns {Promise<{output: string, exitCode: number}>}
 */
function runTest(testFile, scriptsDir) {
  return new Promise((resolve) => {
    const testPath = join(scriptsDir, testFile);
    let output = '';

    const child = spawn('node', [testPath], {
      env: {
        ...process.env,
        BASE_URL: config.BASE_URL,
        HEADLESS: config.HEADLESS,
        REPORT_DIR: config.REPORT_DIR,
        API_URL: config.API_URL
      },
      stdio: ['inherit', 'pipe', 'pipe']
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({ output, exitCode: code ?? 1 });
    });

    child.on('error', (err) => {
      output += `Error: ${err.message}`;
      resolve({ output, exitCode: 1 });
    });
  });
}

/**
 * Parses __RESULT__ from test output
 * @param {string} output - Test output
 * @returns {Object|null}
 */
function parseResult(output) {
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.startsWith('__RESULT__')) {
      try {
        return JSON.parse(line.replace('__RESULT__', ''));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Prints the summary table
 * @param {Array} results - Test results
 */
function printSummary(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SMOKE TEST RESULTS                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    const status = r.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;
    const id = (r.id || 'UNKNOWN').padEnd(10);
    const name = (r.name || 'Unknown').substring(0, 30).padEnd(30);
    const priority = r.priority || 'N/A';
    console.log(`║  ${status}  ${id} ${name} [${priority}]`);
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (failed === 0) {
    console.log(`║  ${colors.green}✓ ALL TESTS PASSED: ${passed} / ${total}${colors.reset}`);
  } else {
    console.log(`║  ${colors.red}✗ SOME TESTS FAILED: ${passed} / ${total} passed, ${failed} failed${colors.reset}`);
    console.log('║');
    console.log('║  Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`║    - ${r.id}: ${r.name}`);
    }
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Main runner function
 */
async function main() {
  console.log('Setting up smoke tests...');

  // Ensure report directory exists
  await mkdir(config.REPORT_DIR, { recursive: true });

  // Determine scripts directory
  // In CI, scripts are copied to ./playwright/smoke-scripts/
  // Locally, they're in the same directory as this file
  let scriptsDir = __dirname;

  // Check if we're in CI (scripts copied to playwright/smoke-scripts)
  try {
    const files = await readdir('./playwright/smoke-scripts');
    if (files.some(f => f.startsWith('smoke-'))) {
      scriptsDir = join(process.cwd(), 'playwright/smoke-scripts');
    }
  } catch {
    // Directory doesn't exist, use __dirname
  }

  console.log(`Scripts directory: ${scriptsDir}`);
  console.log(`Report directory: ${config.REPORT_DIR}`);
  console.log(`Base URL: ${config.BASE_URL}`);
  console.log('');

  console.log('Running smoke tests...\n');

  const results = [];

  for (const testFile of TESTS) {
    console.log('');
    console.log('============================================');
    console.log(`Running: ${testFile}`);
    console.log('============================================');

    const { output } = await runTest(testFile, scriptsDir);
    const result = parseResult(output);

    if (result) {
      results.push(result);
    } else {
      // No result parsed, create a failure entry
      results.push({
        id: testFile.replace('.mjs', '').toUpperCase(),
        name: testFile,
        passed: false,
        error: 'No result output',
        priority: 'N/A'
      });
    }
  }

  // Save results JSON
  const resultsPath = join(config.REPORT_DIR, 'smoke-results.json');
  await writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved: ${resultsPath}`);

  // Generate HTML report
  try {
    const reportModulePath = scriptsDir.startsWith('.')
      ? join(process.cwd(), scriptsDir, 'generate-report.mjs')
      : join(scriptsDir, 'generate-report.mjs');
    const { generateReport } = await import(`file://${reportModulePath}`);
    await generateReport(results);
  } catch (e) {
    console.log(`Could not generate HTML report: ${e.message}`);
  }

  // Print summary
  printSummary(results);

  // Exit with appropriate code
  const failedCount = results.filter(r => !r.passed).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Runner error:', err);
  process.exit(1);
});
