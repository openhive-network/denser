import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isVersionBelow, majorityVersion, parseWitnessSite } from './witness-row.ts';

describe('parseWitnessSite', () => {
  it('opens a post on a Hive front end on our blog as an announcement', () => {
    assert.deepEqual(parseWitnessSite('https://peakd.com/hive-witness/@arcange/witness-update-202103'), {
      kind: 'announcement',
      postPath: '/@arcange/witness-update-202103'
    });
    assert.deepEqual(parseWitnessSite('https://hive.blog/@gtg/witness-gtg'), {
      kind: 'announcement',
      postPath: '/@gtg/witness-gtg'
    });
    assert.deepEqual(parseWitnessSite('https://www.ecency.com/witness/@good-karma/post-1/'), {
      kind: 'announcement',
      postPath: '/@good-karma/post-1'
    });
    assert.deepEqual(parseWitnessSite('https://inleo.io/@khaleelkazi/x'), {
      kind: 'announcement',
      postPath: '/@khaleelkazi/x'
    });
  });

  it('labels any other URL by its host without www and its path', () => {
    assert.deepEqual(parseWitnessSite('https://gtg.openhive.network'), {
      kind: 'external',
      href: 'https://gtg.openhive.network',
      label: 'gtg.openhive.network'
    });
    assert.deepEqual(parseWitnessSite('https://www.blocktrades.us/'), {
      kind: 'external',
      href: 'https://www.blocktrades.us/',
      label: 'blocktrades.us'
    });
    // A profile page is not a post
    assert.deepEqual(parseWitnessSite('https://peakd.com/@peakd'), {
      kind: 'external',
      href: 'https://peakd.com/@peakd',
      label: 'peakd.com/@peakd'
    });
    // A post path on a site that is not a Hive front end
    assert.equal(parseWitnessSite('https://example.com/@alice/post')?.kind, 'external');
  });

  it('truncates a long label to 30 characters with an ellipsis', () => {
    const site = parseWitnessSite('https://some-witness.example.org/about/the/witness/node');
    assert.equal(site?.kind, 'external');
    assert.equal(site?.kind === 'external' && site.label, 'some-witness.example.org/abou…');
  });

  it('rejects URLs that are not https, are unparseable or carry credentials', () => {
    for (const url of ['http://', 'http://gtg.openhive.network', 'not a url', '', 'javascript:alert(1)']) {
      assert.equal(parseWitnessSite(url), null, url);
    }
    assert.equal(parseWitnessSite('https://user:pass@hive.blog/@a/b'), null);
    assert.equal(parseWitnessSite(undefined), null);
  });
});

describe('isVersionBelow', () => {
  it('compares dotted versions part by part as numbers', () => {
    assert.equal(isVersionBelow('1.27.11', '1.28.9'), true);
    assert.equal(isVersionBelow('1.28.9', '1.28.10'), true);
    assert.equal(isVersionBelow('1.28.10', '1.28.9'), false);
    assert.equal(isVersionBelow('1.28.9', '1.28.9'), false);
  });
});

describe('majorityVersion', () => {
  it('is the most common version, the higher one on a tie', () => {
    assert.equal(majorityVersion(['1.28.9', '1.27.11', '1.28.9']), '1.28.9');
    assert.equal(majorityVersion(['1.27.11', '1.28.9']), '1.28.9');
    assert.equal(majorityVersion([]), undefined);
  });
});
