#!/usr/bin/env node
/**
 * Flake report for the Playwright CI jobs (hive/denser#971).
 *
 * Walks the project's pipelines of the last N days, reads each test job's
 * reports from its artifacts and builds a per-test table: runs, failed,
 * passed on retry (flaky) and when it was last seen. The table is printed,
 * and posted as a note on the tracking issue with --post.
 *
 * Per job, the first source that exists is used:
 *   1. results.json: Playwright JSON report. It has runs, failures and flakes.
 *   2. results.xml: junit (runs and failures) plus the job log's end-of-run
 *      "N flaky" list. junit cannot express "passed on retry". This is the
 *      #908 survey's method, used for jobs from before the JSON reporter.
 * A failed job with neither report (timeout, setup failure) is listed apart.
 *
 * Coverage gate: when no test jobs are found, or more than half of them have
 * no readable report (expired or missing artifacts, 403, renamed jobs),
 * nothing is posted and the script exits 3, so the scheduled pipeline goes
 * red instead of reporting "0 failures". Partial coverage is stated in the note.
 *
 * Test titles, files and refs are rendered as inline code, so a title such
 * as "Profile page of @gtg" never mentions a GitLab user.
 *
 * Node built-ins only (Node >= 18 for fetch).
 *
 * Runs weekly from the ci/flake-report branch's pipeline schedule, which
 * fetches this file from develop. Default is a dry run (print only).
 *
 * Usage:
 *   node scripts/ci/flake-report.mjs [--days 7] [--issue 908] [--post] [--out file.md]
 *     [--pipelines 123,456]   (only these pipelines instead of the last N days)
 *   node --test scripts/ci/flake-report.test.mjs   (unit tests)
 *
 * Environment:
 *   FLAKE_REPORT_TOKEN or GITLAB_TOKEN: API token. It reads pipelines, jobs,
 *     artifacts and logs, and with --post creates an issue note (Reporter role
 *     is enough, scope `api`).
 *   CI_API_V4_URL, CI_PROJECT_ID: default to gitlab.syncad.com and 399.
 *   FLAKE_REPORT_DAYS, FLAKE_REPORT_ISSUE: defaults for --days and --issue.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const API = process.env.CI_API_V4_URL || 'https://gitlab.syncad.com/api/v4';
const PROJECT = process.env.CI_PROJECT_ID || '399';
const TOKEN = process.env.FLAKE_REPORT_TOKEN || process.env.GITLAB_TOKEN;
const CONCURRENCY = 8;
const MAX_ATTEMPTS = 5;
const MAX_RETRY_WAIT_MS = 60_000;
/** Exit code when the report is not trustworthy enough to post. */
export const EXIT_LOW_COVERAGE = 3;

/** Where each test job writes its reports (see apps/*\/playwright*.config.ts). */
export function reportDir(jobName) {
  const e2e = /^e2e-tests-(blog|wallet)-(?:stable|flaky): \[(\w+), (\d+), \d+\]$/.exec(jobName);
  if (e2e) return `apps/${e2e[1]}/junit/${e2e[2]}/${e2e[3]}`;
  if (jobName === 'blog-fixture-tests') return 'apps/blog/junit/fixture';
  return null;
}

/** Milliseconds to wait before retrying: Retry-After (seconds or date) if given, else backoff. */
export function retryDelay(retryAfter, attempt, now = Date.now()) {
  let ms = 2000 * attempt;
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(seconds)) ms = seconds * 1000;
    else if (Number.isFinite(date)) ms = date - now;
  }
  return Math.min(Math.max(ms, 0), MAX_RETRY_WAIT_MS);
}

async function api(path, { raw = false, method = 'GET', body } = {}) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(`${API}/projects/${PROJECT}/${path}`, {
        method,
        headers: { 'PRIVATE-TOKEN': TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (err) {
      // Network error: retry like a 5xx.
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${method} ${path}: ${err.message}`);
      await new Promise((r) => setTimeout(r, retryDelay(null, attempt)));
      continue;
    }
    if (res.status === 404) return null;
    if (res.ok) return raw ? res.text() : res.json();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new Error(`${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, retryDelay(res.headers.get('retry-after'), attempt)));
  }
}

async function paged(path) {
  const out = [];
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await api(`${path}${sep}per_page=100&page=${page}`);
    if (!batch?.length) return out;
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}

async function pool(items, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

/** Test identity shared by all sources: "file.spec.ts › describe › title". */
const testKey = (file, titles) => [file, ...titles].join(' › ');

/** Playwright JSON report → [{key, line, outcome}] (outcome: passed|failed|flaky|skipped). */
export function fromJson(report) {
  const out = [];
  const OUTCOME = { expected: 'passed', unexpected: 'failed', flaky: 'flaky', skipped: 'skipped' };
  const walk = (suite, titles) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        out.push({ key: testKey(spec.file, [...titles, spec.title]), line: spec.line, outcome: OUTCOME[t.status] });
      }
    }
    for (const child of suite.suites || []) walk(child, [...titles, child.title]);
  };
  // Top-level suites are files; their title is the file path.
  for (const fileSuite of report.suites || []) walk(fileSuite, []);
  return out;
}

const unxml = (s) =>
  s.replace(/&(lt|gt|quot|apos|amp);/g, (_, e) => ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[e]);

/** Playwright junit → [{key, outcome}] (passed|failed|skipped; no flaky). */
export function fromJunit(xml) {
  const out = [];
  const re = /<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g;
  for (let m; (m = re.exec(xml)); ) {
    const attr = (n) => unxml((new RegExp(`\\b${n}="([^"]*)"`).exec(m[1]) || [])[1] || '');
    const body = m[2];
    const outcome = /^\s*(<properties>[\s\S]*?<\/properties>\s*)?<skipped/.test(body)
      ? 'skipped'
      : /^\s*(<properties>[\s\S]*?<\/properties>\s*)?<failure/.test(body)
        ? 'failed'
        : 'passed';
    out.push({ key: testKey(attr('classname'), attr('name').split(' › ')), outcome });
  }
  return out;
}

// Job-log parsing, as in the #908 survey: the list reporter's end-of-run
// summary ("  3 flaky" followed by "    [chromium] › file.spec.ts:12:5 › a › b").
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
// GitLab job logs may prefix each line with "<timestamp> <stream id>O ".
const LOG_PREFIX = /^\S+Z \d+[OE]\+?\s?/;
const CATEGORY = /^\s+(\d+) (failed|flaky|passed|skipped|did not run|interrupted)/;
const ENTRY = /^\s+(?:\d+\)\s+)?\[[^\]]+\] › (.+?):(\d+):\d+ › (.+?)\s*(?:\(retry #\d+\))?\s*$/;
export function flakyFromLog(log) {
  const flaky = [];
  let category = null;
  for (const rawLine of log.split('\n')) {
    const line = rawLine.replace(ANSI, '').replace(/\r$/, '').replace(LOG_PREFIX, '');
    const c = CATEGORY.exec(line);
    if (c) {
      category = c[2];
      continue;
    }
    if (category !== 'flaky') continue;
    const e = ENTRY.exec(line);
    if (e) flaky.push({ key: testKey(e[1], e[3].split(' › ')), line: Number(e[2]) });
    else if (line.trim() && !line.startsWith('    ')) category = null;
  }
  return flaky;
}

/**
 * Read one job's results: {source, tests}, or {source: 'none', reason} when
 * no report could be read (the reason ends up in the note's coverage line).
 */
async function readJob(job) {
  const dir = reportDir(job.name);
  if (!dir) return { source: 'none', tests: [], reason: 'unknown job name' };
  let json;
  let xml;
  try {
    json = await api(`jobs/${job.id}/artifacts/${dir}/results.json`, { raw: true });
    if (json) return { source: 'json', tests: fromJson(JSON.parse(json)) };
  } catch (err) {
    // Unreadable, truncated or malformed JSON report: try junit before giving up.
    json = err;
  }
  try {
    xml = await api(`jobs/${job.id}/artifacts/${dir}/results.xml`, { raw: true });
  } catch (err) {
    return { source: 'none', tests: [], reason: err.message.replace(/^GET \S+: /, '') };
  }
  if (!xml) {
    const reason = json instanceof Error ? json.message.replace(/^GET \S+: /, '') : 'no report in artifacts';
    return { source: 'none', tests: [], reason };
  }
  const tests = fromJunit(xml);
  const log = (await api(`jobs/${job.id}/trace`, { raw: true }).catch(() => null)) || '';
  const flaky = new Map(flakyFromLog(log).map((f) => [f.key, f.line]));
  for (const t of tests) {
    if (t.outcome === 'passed' && flaky.has(t.key)) {
      t.outcome = 'flaky';
      t.line = flaky.get(t.key);
    }
  }
  return { source: 'junit+log', tests };
}

const TEST_JOB = /^(e2e-tests-(blog|wallet)-(stable|flaky)|blog-fixture-tests)\b/;

async function collect({ days, pipelineIds }) {
  const since = new Date(Date.now() - days * 86400e3);
  const pipelines = pipelineIds
    ? await Promise.all(pipelineIds.map((id) => api(`pipelines/${id}`)))
    : await paged(`pipelines?updated_after=${since.toISOString()}&order_by=id&sort=desc`);
  const jobLists = await pool(pipelines, async (p) =>
    (await paged(`pipelines/${p.id}/jobs?include_retried=true`))
      .filter((j) => TEST_JOB.test(j.name) && (j.status === 'success' || j.status === 'failed'))
      .map((j) => ({ ...j, pipeline: p }))
  );
  const jobs = jobLists.flat();
  const reads = await pool(jobs, readJob);
  return { since, pipelines, jobs, reads };
}

export function aggregate(jobs, reads) {
  const byTest = new Map();
  const unreported = [];
  const missing = [];
  const sources = {};
  jobs.forEach((job, i) => {
    const { source, tests, reason } = reads[i];
    sources[source] = (sources[source] || 0) + 1;
    if (source === 'none') {
      missing.push({ job, reason });
      if (job.status === 'failed') unreported.push(job);
      return;
    }
    const suite = job.name.replace(/: \[.*$/, '');
    for (const t of tests) {
      if (t.outcome === 'skipped') continue;
      const row = byTest.get(t.key) || { key: t.key, line: null, jobs: new Set(), runs: 0, failed: 0, flaky: 0, last: null };
      row.runs++;
      row.jobs.add(suite);
      if (t.line) row.line = t.line;
      if (t.outcome === 'failed' || t.outcome === 'flaky') {
        row[t.outcome]++;
        const at = job.finished_at || job.created_at;
        if (!row.last || at > row.last.at) row.last = { at, job };
      }
      byTest.set(t.key, row);
    }
  });
  const rows = [...byTest.values()]
    .filter((r) => r.failed || r.flaky)
    .sort((a, b) => b.failed + b.flaky - (a.failed + a.flaky) || b.last.at.localeCompare(a.last.at));
  return { rows, unreported, missing, sources, testsSeen: byTest.size };
}

/**
 * Decide whether the report is complete enough to post: null if so, else
 * the reason not to.
 */
export function coverageProblem(jobCount, missingCount) {
  if (jobCount === 0) return 'no finished test jobs in the window';
  if (missingCount > jobCount / 2) {
    return `${missingCount} of ${jobCount} test jobs had no readable report (more than half)`;
  }
  return null;
}

/**
 * Markdown inline code that is safe inside a table cell: a fence longer than
 * any backtick run in the text, and "|" escaped for the table. Text in a code
 * span is literal, so "@gtg" there creates no GitLab mention.
 */
export function code(text) {
  const s = String(text).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
  const longestRun = Math.max(0, ...(s.match(/`+/g) || []).map((run) => run.length));
  const fence = '`'.repeat(longestRun + 1);
  const pad = s.startsWith('`') || s.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${s}${pad}${fence}`;
}

export function render({ since, pipelines, jobs }, { rows, unreported, missing, sources, testsSeen }, rowLimit = 40) {
  const day = (iso) => iso.slice(0, 10);
  const lines = [
    `### Weekly flake report: ${day(since.toISOString())} to ${day(new Date().toISOString())}`,
    '',
    `${pipelines.length} pipelines, ${jobs.length} test jobs (retries included), ${testsSeen} distinct tests run. ` +
      `**${rows.length}** tests failed or passed only on retry at least once.`,
    ''
  ];
  if (missing.length) {
    const reasons = {};
    for (const m of missing) reasons[m.reason] = (reasons[m.reason] || 0) + 1;
    const why = Object.entries(reasons)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, n]) => `${n}× ${code(reason)}`)
      .join(', ');
    lines.push(
      `Coverage: read ${jobs.length - missing.length} of ${jobs.length} jobs; ${missing.length} had no report (${why}).`,
      ''
    );
  }
  if (rows.length) {
    lines.push('| Test | Job | Runs | Failed | Passed on retry | Last seen |', '|---|---|--:|--:|--:|---|');
    for (const r of rows.slice(0, rowLimit)) {
      const [file, ...titles] = r.key.split(' › ');
      const test = code(`${file}${r.line ? `:${r.line}` : ''} › ${titles.join(' › ')}`);
      lines.push(
        `| ${test} | ${[...r.jobs].map(code).join(', ')} | ${r.runs} | ${r.failed} | ${r.flaky} | ` +
          `[${day(r.last.at)}](${r.last.job.web_url}) (${code(r.last.job.pipeline.ref)}) |`
      );
    }
    if (rows.length > rowLimit) lines.push('', `…and ${rows.length - rowLimit} more (see the job artifact).`);
  }
  if (unreported.length) {
    lines.push('', `Failed jobs with no test report (timeout, setup or service failure): ${unreported.length}`);
    for (const j of unreported.slice(0, 15)) lines.push(`- [${code(j.name)}](${j.web_url}) (${code(j.pipeline.ref)})`);
  }
  lines.push(
    '',
    `<sub>Sources per job: ${Object.entries(sources)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}. "Passed on retry" comes from Playwright's JSON report, or for older jobs from the ` +
      `list reporter's end-of-run "flaky" summary in the log. Generated by \`scripts/ci/flake-report.mjs\` (#971).</sub>`
  );
  return lines.join('\n');
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      days: { type: 'string', default: process.env.FLAKE_REPORT_DAYS || '7' },
      issue: { type: 'string', default: process.env.FLAKE_REPORT_ISSUE || '908' },
      pipelines: { type: 'string' },
      post: { type: 'boolean', default: false },
      out: { type: 'string' },
      limit: { type: 'string', default: '40' }
    }
  });
  if (!TOKEN) {
    console.error('flake-report: set FLAKE_REPORT_TOKEN (or GITLAB_TOKEN)');
    process.exit(2);
  }
  const data = await collect({
    days: Number(args.days),
    pipelineIds: args.pipelines ? args.pipelines.split(',').map((id) => id.trim()) : null
  });
  const summary = aggregate(data.jobs, data.reads);
  const note = render(data, summary, Number(args.limit));
  console.log(note);
  if (args.out) writeFileSync(args.out, note + '\n');
  const problem = coverageProblem(data.jobs.length, summary.missing.length);
  if (problem) {
    console.error(`flake-report: not posting: ${problem}`);
    process.exit(EXIT_LOW_COVERAGE);
  }
  if (args.post) {
    const posted = await api(`issues/${args.issue}/notes`, { method: 'POST', body: { body: note } });
    console.error(`flake-report: posted note ${posted.id} on #${args.issue}`);
  } else {
    console.error(`flake-report: dry run (pass --post to comment on #${args.issue})`);
  }
}

// Run only when executed, not when imported by the unit tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
