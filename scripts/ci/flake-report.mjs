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
 * Node built-ins only (Node >= 18 for fetch).
 *
 * Runs weekly from the ci/flake-report branch's pipeline schedule, which
 * fetches this file from develop. Default is a dry run (print only).
 *
 * Usage:
 *   node scripts/ci/flake-report.mjs [--days 7] [--issue 908] [--post] [--out file.md]
 *
 * Environment:
 *   FLAKE_REPORT_TOKEN or GITLAB_TOKEN: API token. It reads pipelines, jobs,
 *     artifacts and logs, and with --post creates an issue note (Reporter role
 *     is enough, scope `api`).
 *   CI_API_V4_URL, CI_PROJECT_ID: default to gitlab.syncad.com and 399.
 *   FLAKE_REPORT_DAYS, FLAKE_REPORT_ISSUE: defaults for --days and --issue.
 */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    days: { type: 'string', default: process.env.FLAKE_REPORT_DAYS || '7' },
    issue: { type: 'string', default: process.env.FLAKE_REPORT_ISSUE || '908' },
    post: { type: 'boolean', default: false },
    out: { type: 'string' },
    limit: { type: 'string', default: '40' }
  }
});

const API = process.env.CI_API_V4_URL || 'https://gitlab.syncad.com/api/v4';
const PROJECT = process.env.CI_PROJECT_ID || '399';
const TOKEN = process.env.FLAKE_REPORT_TOKEN || process.env.GITLAB_TOKEN;
const CONCURRENCY = 8;
const DAYS = Number(args.days);
const ROW_LIMIT = Number(args.limit);

if (!TOKEN) {
  console.error('flake-report: set FLAKE_REPORT_TOKEN (or GITLAB_TOKEN)');
  process.exit(2);
}

/** Where each test job writes its reports (see apps/*\/playwright*.config.ts). */
function reportDir(jobName) {
  const e2e = /^e2e-tests-(blog|wallet)-(?:stable|flaky): \[(\w+), (\d+), \d+\]$/.exec(jobName);
  if (e2e) return `apps/${e2e[1]}/junit/${e2e[2]}/${e2e[3]}`;
  if (jobName === 'blog-fixture-tests') return 'apps/blog/junit/fixture';
  return null;
}

async function api(path, { raw = false, method = 'GET', body } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/projects/${PROJECT}/${path}`, {
      method,
      headers: { 'PRIVATE-TOKEN': TOKEN, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 404) return null;
    if (res.ok) return raw ? res.text() : res.json();
    if (attempt >= 3 || res.status < 500) {
      throw new Error(`${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
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
function fromJson(report) {
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
function fromJunit(xml) {
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
function flakyFromLog(log) {
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

/** Read one job's results; returns {source, tests} or {source: 'none'}. */
async function readJob(job) {
  const dir = reportDir(job.name);
  if (!dir) return { source: 'none', tests: [] };
  const json = await api(`jobs/${job.id}/artifacts/${dir}/results.json`, { raw: true }).catch(() => null);
  if (json) {
    try {
      return { source: 'json', tests: fromJson(JSON.parse(json)) };
    } catch {
      // Truncated or malformed report: fall through to junit.
    }
  }
  const xml = await api(`jobs/${job.id}/artifacts/${dir}/results.xml`, { raw: true }).catch(() => null);
  if (!xml) return { source: 'none', tests: [] };
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

async function collect() {
  const since = new Date(Date.now() - DAYS * 86400e3);
  const pipelines = await paged(`pipelines?updated_after=${since.toISOString()}&order_by=id&sort=desc`);
  const jobLists = await pool(pipelines, async (p) =>
    (await paged(`pipelines/${p.id}/jobs?include_retried=true`))
      .filter((j) => TEST_JOB.test(j.name) && (j.status === 'success' || j.status === 'failed'))
      .map((j) => ({ ...j, pipeline: p }))
  );
  const jobs = jobLists.flat();
  const reads = await pool(jobs, readJob);
  return { since, pipelines, jobs, reads };
}

function aggregate(jobs, reads) {
  const byTest = new Map();
  const unreported = [];
  const sources = {};
  jobs.forEach((job, i) => {
    const { source, tests } = reads[i];
    sources[source] = (sources[source] || 0) + 1;
    if (source === 'none') {
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
  return { rows, unreported, sources, testsSeen: byTest.size };
}

const md = (s) => s.replace(/\|/g, '\\|');

function render({ since, pipelines, jobs }, { rows, unreported, sources, testsSeen }) {
  const day = (iso) => iso.slice(0, 10);
  const lines = [
    `### Weekly flake report: ${day(since.toISOString())} to ${day(new Date().toISOString())}`,
    '',
    `${pipelines.length} pipelines, ${jobs.length} test jobs (retries included), ${testsSeen} distinct tests run. ` +
      `**${rows.length}** tests failed or passed only on retry at least once.`,
    ''
  ];
  if (rows.length) {
    lines.push('| Test | Job | Runs | Failed | Passed on retry | Last seen |', '|---|---|--:|--:|--:|---|');
    for (const r of rows.slice(0, ROW_LIMIT)) {
      const [file, ...titles] = r.key.split(' › ');
      const where = `\`${file}${r.line ? `:${r.line}` : ''}\``;
      lines.push(
        `| ${where} ${md(titles.join(' › '))} | ${[...r.jobs].join(', ')} | ${r.runs} | ${r.failed} | ${r.flaky} | ` +
          `[${day(r.last.at)}](${r.last.job.web_url}) (${md(r.last.job.pipeline.ref)}) |`
      );
    }
    if (rows.length > ROW_LIMIT) lines.push('', `…and ${rows.length - ROW_LIMIT} more (see the job artifact).`);
  }
  if (unreported.length) {
    lines.push('', `Failed jobs with no test report (timeout, setup or service failure): ${unreported.length}`);
    for (const j of unreported.slice(0, 15)) lines.push(`- [${j.name}](${j.web_url}) (${md(j.pipeline.ref)})`);
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
  const data = await collect();
  const summary = aggregate(data.jobs, data.reads);
  const note = render(data, summary);
  console.log(note);
  if (args.out) writeFileSync(args.out, note + '\n');
  if (args.post) {
    const posted = await api(`issues/${args.issue}/notes`, { method: 'POST', body: { body: note } });
    console.error(`flake-report: posted note ${posted.id} on #${args.issue}`);
  } else {
    console.error(`flake-report: dry run (pass --post to comment on #${args.issue})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
