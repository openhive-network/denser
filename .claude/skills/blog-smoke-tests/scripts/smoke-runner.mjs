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
  API_URL: process.env.API_URL || 'https://api.hive.blog',
  // Every smoke test runs against live chain data through public API nodes, so
  // a single slow upstream response can fail any of them (#965). A failing test
  // is re-run up to MAX_ATTEMPTS times in total (as SKILL.md documents); a test
  // that needed a retry still passes but is reported as flaky, so the noise
  // stays visible without hiding a failure that reproduces on every attempt.
  MAX_ATTEMPTS: Math.max(1, parseInt(process.env.SMOKE_MAX_ATTEMPTS || '3', 10) || 3),
  RETRY_DELAY_MS: parseInt(process.env.SMOKE_RETRY_DELAY_MS || '5000', 10)
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
 * Short description of why an attempt failed, for the flaky-pass warning.
 * @param {Object|null} result - Parsed __RESULT__ (null if none)
 * @param {string} output - Raw test output
 * @returns {string}
 */
function describeFailure(result, output) {
  if (result?.error) return result.error.split('\n')[0].substring(0, 160);
  const failLine = output.split('\n').find((line) => line.includes('✗ FAIL:'));
  if (failLine) return failLine.replace(/^.*✗ FAIL:\s*/, '').substring(0, 160);
  return result ? 'test reported failure' : 'no result output';
}

/**
 * Runs a test, retrying on failure up to config.MAX_ATTEMPTS attempts.
 * @param {string} testFile - Test filename
 * @param {string} scriptsDir - Directory containing test scripts
 * @returns {Promise<Object>} - Result with attempts and warnings
 */
async function runTestWithRetry(testFile, scriptsDir) {
  const failures = [];
  let result = null;
  for (let attempt = 1; attempt <= config.MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`${colors.yellow}Retrying ${testFile} (attempt ${attempt}/${config.MAX_ATTEMPTS}) in ${config.RETRY_DELAY_MS / 1000}s...${colors.reset}`);
      await new Promise((resolve) => setTimeout(resolve, config.RETRY_DELAY_MS));
    }
    const { output } = await runTest(testFile, scriptsDir);
    result = parseResult(output) || {
      id: testFile.replace('.mjs', '').toUpperCase(),
      name: testFile,
      passed: false,
      error: 'No result output',
      priority: 'N/A'
    };
    result.attempts = attempt;
    result.warnings = result.warnings || [];
    if (result.passed) break;
    failures.push(`attempt ${attempt}: ${describeFailure(result, output)}`);
  }
  if (result.passed && failures.length > 0) {
    result.flaky = true;
    result.warnings.unshift(`flaky: passed on attempt ${result.attempts}/${config.MAX_ATTEMPTS} after ${failures.join('; ')}`);
  } else if (!result.passed && failures.length > 1) {
    result.error = `${result.error || 'failed'} (failed all ${failures.length} attempts: ${failures.join('; ')})`;
  }
  return result;
}

/**
 * Prints the summary table
 * @param {Array} results - Test results
 */
function printSummary(results) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const warned = results.filter(r => r.passed && r.warnings && r.warnings.length > 0);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SMOKE TEST RESULTS                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    let status = `${colors.red}✗ FAIL${colors.reset}`;
    if (r.passed) {
      status = r.warnings && r.warnings.length > 0
        ? `${colors.yellow}⚠ WARN${colors.reset}`
        : `${colors.green}✓ PASS${colors.reset}`;
    }
    const id = (r.id || 'UNKNOWN').padEnd(10);
    const name = (r.name || 'Unknown').substring(0, 30).padEnd(30);
    const priority = r.priority || 'N/A';
    console.log(`║  ${status}  ${id} ${name} [${priority}]`);
  }

  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (warned.length > 0) {
    console.log(`║  ${colors.yellow}⚠ WARNINGS (passed, but degraded or flaky):${colors.reset}`);
    for (const r of warned) {
      for (const w of r.warnings) {
        console.log(`║    - ${r.id}: ${w}`);
      }
    }
    console.log('║');
  }

  if (failed === 0) {
    console.log(`║  ${colors.green}✓ ALL TESTS PASSED: ${passed} / ${total}${warned.length ? ` (${warned.length} with warnings)` : ''}${colors.reset}`);
  } else {
    console.log(`║  ${colors.red}✗ SOME TESTS FAILED: ${passed} / ${total} passed, ${failed} failed${colors.reset}`);
    console.log('║');
    console.log('║  Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`║    - ${r.id}: ${r.name}${r.error ? ` — ${r.error.substring(0, 300)}` : ''}`);
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
  console.log(`Max attempts per test: ${config.MAX_ATTEMPTS}`);
  console.log('');

  console.log('Running smoke tests...\n');

  const results = [];

  for (const testFile of TESTS) {
    console.log('');
    console.log('============================================');
    console.log(`Running: ${testFile}`);
    console.log('============================================');

    results.push(await runTestWithRetry(testFile, scriptsDir));
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
