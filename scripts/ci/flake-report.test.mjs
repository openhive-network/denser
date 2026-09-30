// Unit tests for flake-report.mjs: node --test scripts/ci/flake-report.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregate, code, coverageProblem, fromJson, fromJunit, render, retryDelay } from './flake-report.mjs';

const job = (id, name, status = 'success') => ({
  id,
  name,
  status,
  web_url: `https://example.test/jobs/${id}`,
  finished_at: '2026-09-30T10:00:00Z',
  pipeline: { id: 1, ref: 'develop' }
});

/** Every "@" in the note must be inside inline code, so GitLab makes no mention. */
function mentionsOutsideCode(markdown) {
  const withoutCode = markdown.replace(/(`+)[\s\S]*?\1/g, '');
  return withoutCode.match(/@\w+/g) || [];
}

test('titles with @users are rendered as inline code, never as mentions', () => {
  const report = {
    suites: [
      {
        title: 'profilePostsPage.spec.ts',
        specs: [],
        suites: [
          {
            title: 'Profile page of @gtg',
            specs: [
              {
                title: '@flaky posts of @blocktrades | list',
                file: 'profilePostsPage.spec.ts',
                line: 25,
                tests: [{ status: 'flaky' }]
              }
            ]
          }
        ]
      }
    ]
  };
  const jobs = [job(1, 'e2e-tests-blog-stable: [chromium, 1, 5]')];
  const summary = aggregate(jobs, [{ source: 'json', tests: fromJson(report) }]);
  const note = render({ since: new Date('2026-09-23'), pipelines: [{}], jobs }, summary);
  assert.match(note, /`profilePostsPage.spec.ts:25 › Profile page of @gtg › @flaky posts of @blocktrades \\\| list`/);
  assert.deepEqual(mentionsOutsideCode(note), []);
});

test('code() fences backticks and escapes table pipes', () => {
  assert.equal(code('a `b` c'), '``a `b` c``');
  assert.equal(code('`edge'), '`` `edge ``');
  assert.equal(code('x | y'), '`x \\| y`');
});

test('coverage gate: no jobs or mostly missing reports block posting', () => {
  assert.match(coverageProblem(0, 0), /no finished test jobs/);
  assert.match(coverageProblem(10, 6), /6 of 10/);
  assert.equal(coverageProblem(10, 5), null);
  assert.equal(coverageProblem(10, 0), null);
});

test('partial coverage is stated in the note', () => {
  const jobs = [job(1, 'blog-fixture-tests'), job(2, 'blog-fixture-tests')];
  const reads = [
    { source: 'junit+log', tests: fromJunit('<testcase name="a" classname="x.spec.ts" time="1"></testcase>') },
    { source: 'none', tests: [], reason: 'HTTP 403 Forbidden' }
  ];
  const note = render({ since: new Date('2026-09-23'), pipelines: [{}], jobs }, aggregate(jobs, reads));
  assert.match(note, /read 1 of 2 jobs; 1 had no report \(1× `HTTP 403 Forbidden`\)/);
});

test('retryDelay honours Retry-After, bounded', () => {
  assert.equal(retryDelay('5', 1), 5000);
  assert.equal(retryDelay('3600', 1), 60_000);
  assert.equal(retryDelay(null, 2), 4000);
  const now = Date.parse('2026-09-30T10:00:00Z');
  assert.equal(retryDelay('Wed, 30 Sep 2026 10:00:10 GMT', 1, now), 10_000);
});
