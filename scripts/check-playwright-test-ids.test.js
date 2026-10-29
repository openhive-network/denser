const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findTestIds, findDuplicateIds, formatSeparatorCounts } = require('./check-playwright-test-ids');

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
  test('CMT-06 — an em dash', async () => {});
  test.step('CMT-07: a step is not a test', async () => {});
  test.skip(isMobile, 'CMT-08: a reason is not a title');
  expect(/x/.test('CMT-09: a regex test call')).toBe(false);
  test('CMT-10 – an en dash', async () => {});
  test('CMT-11 - a spaced hyphen', async () => {});
  test('CMT-12-3 — a hyphen inside the ID', async () => {});
  test('CMT-13- not a separator', async () => {});
  test('CMT-14 -not a separator', async () => {});
  test('CMT-15 no separator', async () => {});
  test('CMT-16  : spaces before the colon', async () => {});
  test('CMT-17—no spaces', async () => {});
});
`;

test('IDs followed by a colon, em dash, en dash or spaced hyphen are read from test, test.skip/fixme and test.describe titles, with their lines', () => {
  assert.deepEqual(findTestIds(SPEC).ids, [
    { id: 'CMT-00', separator: ':', line: 3 },
    { id: 'CMT-01', separator: ':', line: 4 },
    { id: 'CMT-02', separator: ':', line: 6 },
    { id: 'CMT-03a', separator: ':', line: 9 },
    { id: 'CMT-04', separator: ':', line: 10 },
    { id: 'CMT-05', separator: ':', line: 11 },
    { id: 'CMT-06', separator: '—', line: 14 },
    { id: 'CMT-10', separator: '–', line: 18 },
    { id: 'CMT-11', separator: '-', line: 19 },
    { id: 'CMT-12-3', separator: '—', line: 20 },
    { id: 'CMT-16', separator: ':', line: 24 },
    { id: 'CMT-17', separator: '—', line: 25 }
  ]);
});

test('template-literal titles with a computed ID are reported as skipped, not checked', () => {
  assert.deepEqual(findTestIds(SPEC).templateLines, [12]);
});

test('separator counts are listed most frequent first', () => {
  const { ids } = findTestIds(SPEC);
  assert.equal(formatSeparatorCounts(ids), '":" 7, "—" 3, "-" 1, "–" 1');
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

