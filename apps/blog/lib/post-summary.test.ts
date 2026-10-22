import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { JsonMetadata } from '@hive/common-hiveio-packages/wax';

const { getPostSummary } = await import('./post-summary.ts');

const metadata = (fields: Partial<JsonMetadata>): JsonMetadata => ({
  image: '',
  images: [],
  author: undefined,
  ...fields
});

// Parsed like real client-written json_metadata, so fields may hold any JSON type.
const parsedMetadata = (json: string): JsonMetadata => ({ ...metadata({}), ...JSON.parse(json) });

const BODY = 'First paragraph of the body.';
const BODY_SUMMARY = 'First paragraph of the body.';

const HIVESUITE_DESCRIPTION = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  '',
  '![snap](https://images.hive.blog/0x0/https://files.peakd.com/file/peakd-hive/sagarkothari88/snap.png)',
  '',
  '# HiveSuite dev update: smarter snaps',
  '',
  'Today we shipped **smarter snaps** in HiveReactKit, with a [new feed](https://example.com/feed).',
  '',
  ...Array.from({ length: 60 }, (_, i) => `- Item ${i} with some descriptive text about the change.`)
].join('\n');

describe('getPostSummary', () => {
  it('returns a well-formed description unchanged', () => {
    const description = 'snake_case and *stars* see https://hive.blog/@a/b';
    assert.equal(getPostSummary(metadata({ description }), BODY), description);
  });

  it('returns a well-formed summary field unchanged', () => {
    assert.equal(getPostSummary(metadata({ summary: 'A_short summary' }), BODY), 'A_short summary');
  });

  it('derives the summary from the body when the metadata has none', () => {
    assert.equal(getPostSummary(metadata({}), BODY), BODY_SUMMARY);
  });

  it('cleans a multi-line markdown description to a short line of plain text', () => {
    assert.ok(HIVESUITE_DESCRIPTION.length > 3000);
    const summary = getPostSummary(metadata({ description: HIVESUITE_DESCRIPTION }), BODY);

    assert.ok(summary.startsWith('HiveSuite dev update: smarter snaps'), summary);
    assert.ok(summary.length <= 200, `length ${summary.length}`);
    assert.ok(summary.endsWith('…'));
    assert.doesNotMatch(summary, /\n|https?:|[#*!\[\]]/);
    assert.doesNotMatch(summary, /\s{2}/);
  });

  it('joins the blocks of a markdown body with single spaces', () => {
    const body = '# Snaps Feed\n\nImproved the **scroll-to-top** behaviour.\n\n- Reliable scrolling\n- Fewer jumps';
    const summary = getPostSummary(metadata({}), body);

    assert.equal(summary, 'Snaps Feed Improved the scroll-to-top behaviour. Reliable scrolling Fewer jumps');
  });

  it('returns a well-formed description with a double space unchanged', () => {
    const description = 'Two  spaces stay as written';
    assert.equal(getPostSummary(metadata({ description }), BODY), description);
  });

  it('truncates an over-long single-line description', () => {
    const description = 'word '.repeat(60).trim();
    const summary = getPostSummary(metadata({ description }), BODY);

    assert.ok(summary.length <= 200, `length ${summary.length}`);
    assert.ok(summary.endsWith('…'));
    assert.ok(description.startsWith(summary.slice(0, -1)));
  });

  it('falls back to the body when a malformed description cleans to nothing', () => {
    const description = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n![](https://images.hive.blog/a.png)';

    assert.equal(getPostSummary(metadata({ description }), BODY), BODY_SUMMARY);
  });

  it('strips leading quotes from a malformed description when asked', () => {
    assert.equal(getPostSummary(metadata({ description: '> quoted line\n\nOwn words' }), BODY, true), 'Own words');
  });

  it('ignores a numeric description and uses the body', () => {
    assert.equal(getPostSummary(parsedMetadata('{"description": 42}'), BODY), BODY_SUMMARY);
  });

  it('ignores an object description and uses the body', () => {
    assert.equal(getPostSummary(parsedMetadata('{"description": {"text": "x"}}'), BODY), BODY_SUMMARY);
  });

  it('ignores an array description and uses the body', () => {
    assert.equal(getPostSummary(parsedMetadata('{"description": ["a\\nb"]}'), BODY), BODY_SUMMARY);
  });

  it('uses a string summary when the description is not a string', () => {
    const json = '{"description": 7, "summary": "A_short summary"}';
    assert.equal(getPostSummary(parsedMetadata(json), BODY), 'A_short summary');
  });

  it('ignores a non-string summary and uses the body', () => {
    assert.equal(getPostSummary(parsedMetadata('{"summary": {"a": 1}}'), BODY), BODY_SUMMARY);
  });
});
