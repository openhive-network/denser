import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import {
  hasPublishedFeed,
  isVersionBelow,
  majorityVersion,
  parseWitnessOwners,
  parseWitnessSite
} from './witness-row.ts';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('./') && !specifier.endsWith('.ts'))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const { formatList } = await import('../../../packages/ui/lib/locale-format.ts');

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
    assert.deepEqual(parseWitnessSite('https://hivesuite.app/@stresskiller/and-then-you-decide-to'), {
      kind: 'announcement',
      postPath: '/@stresskiller/and-then-you-decide-to'
    });
    assert.deepEqual(parseWitnessSite('https://ureka.social/@ura-soul/vote-ura-soul-as-your-hive-witness'), {
      kind: 'announcement',
      postPath: '/@ura-soul/vote-ura-soul-as-your-hive-witness'
    });
  });

  it("labels a tab of an account's page as an external site, not an announcement", () => {
    assert.deepEqual(parseWitnessSite('https://peakd.com/@dalz/posts'), {
      kind: 'external',
      href: 'https://peakd.com/@dalz/posts',
      label: 'peakd.com/@dalz/posts'
    });
    for (const tab of ['blog', 'comments', 'replies', 'wallet', 'followers', 'following']) {
      assert.equal(parseWitnessSite(`https://hive.blog/@alice/${tab}`)?.kind, 'external', tab);
    }
    assert.equal(parseWitnessSite('https://ecency.com/hive-1/@alice/posts')?.kind, 'external');
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

describe('hasPublishedFeed', () => {
  it('is true for a feed update after the epoch', () => {
    assert.equal(hasPublishedFeed('2026-11-17T16:26:18'), true);
    assert.equal(hasPublishedFeed('2026-11-17T16:26:18.000Z'), true);
  });

  it('is false for the epoch the chain gives a witness that never published, or no date', () => {
    assert.equal(hasPublishedFeed('1970-01-01T00:00:00'), false);
    assert.equal(hasPublishedFeed(''), false);
    assert.equal(hasPublishedFeed(undefined), false);
    assert.equal(hasPublishedFeed('not a date'), false);
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

describe('parseWitnessOwners', () => {
  it('trims the comma-separated names and drops empty ones', () => {
    assert.deepEqual(parseWitnessOwners('alice, bob'), ['alice', 'bob']);
    assert.deepEqual(parseWitnessOwners(' alice ,, bob ,'), ['alice', 'bob']);
    assert.equal(formatList(parseWitnessOwners('alice, bob'), 'en'), 'alice and bob');
    assert.equal(formatList(parseWitnessOwners('alice,'), 'en'), 'alice');
  });

  it('gives no names for an empty, blank or missing field', () => {
    assert.deepEqual(parseWitnessOwners(undefined), []);
    assert.deepEqual(parseWitnessOwners(''), []);
    assert.deepEqual(parseWitnessOwners(' , ,'), []);
  });
});
