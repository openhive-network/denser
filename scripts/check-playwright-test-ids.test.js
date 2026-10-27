const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findTestIds, findDuplicateIds } = require('./check-playwright-test-ids');

const SPEC = `import { test } from '../support/fixture-proxy-test';

test.describe('CMT-00: comments', () => {
  test('CMT-01: comment on a post', async () => {});
  test.skip(
    "CMT-02: reply to a comment",
    async () => {}
  );
  test.describe.serial('CMT-03a: ordered', () => {});
  test.fixme('CMT-04: later', async () => {});
  test(\`CMT-05: one per \${variant}\`, async () => {});
  test(\`CMT-0\${index}: numbered by the loop\`, async () => {});
  test('no ID here', async () => {});
  test('CMT-06 — a dash, not a colon', async () => {});
  test.step('CMT-07: a step is not a test', async () => {});
  test.skip(isMobile, 'CMT-08: a reason is not a title');
  expect(/x/.test('CMT-09: a regex test call')).toBe(false);
});
`;

test('IDs are read from test, test.skip/fixme and test.describe titles, with their lines', () => {
  assert.deepEqual(findTestIds(SPEC).ids, [
    { id: 'CMT-00', line: 3 },
    { id: 'CMT-01', line: 4 },
    { id: 'CMT-02', line: 6 },
    { id: 'CMT-03a', line: 9 },
    { id: 'CMT-04', line: 10 }
  ]);
});

test('template-literal titles starting with an ID are reported as skipped, not checked', () => {
  assert.deepEqual(findTestIds(SPEC).templateLines, [11, 12]);
});

test('an ID used once is not a duplicate; one used twice lists every location', () => {
  const duplicates = findDuplicateIds([
    { id: 'CSP-03', location: 'a.spec.ts:56' },
    { id: 'CSP-04', location: 'b.spec.ts:16' },
    { id: 'CMT-03', location: 'c.spec.ts:42' },
    { id: 'CSP-03', location: 'd.spec.ts:15' },
    { id: 'CMT-03', location: 'e.spec.ts:113' }
  ]);
  assert.deepEqual(duplicates, [
    { id: 'CMT-03', locations: ['c.spec.ts:42', 'e.spec.ts:113'] },
    { id: 'CSP-03', locations: ['a.spec.ts:56', 'd.spec.ts:15'] }
  ]);
});

