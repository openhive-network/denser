import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { postCanonicalUrl } = await import('./canonical-url.ts');

const POST = { category: 'hive-167922', author: 'alice', permlink: 'my-post' };
const OWN_PATH = '/hive-167922/@alice/my-post';

describe('postCanonicalUrl', () => {
  it('uses a valid json_metadata.canonical_url', () => {
    for (const url of [
      'https://inleo.io/@alice/my-post',
      'hive://alice/my-post',
      '://example.com/my-post'
    ]) {
      assert.equal(postCanonicalUrl({ ...POST, json_metadata: { canonical_url: url, app: 'peakd/1.0' } }), url);
    }
  });

  it('ignores a canonical_url that is not a hive:// or https:// URL', () => {
    for (const url of ['javascript:alert(1)', '/relative/path', 'http://example.com/x', 'ftp://x/y', '', 42, null, ['https://x.y']]) {
      assert.equal(
        postCanonicalUrl({ ...POST, json_metadata: { canonical_url: url } }),
        OWN_PATH,
        `canonical_url ${JSON.stringify(url)}`
      );
    }
  });

  it('falls back to the publishing app when canonical_url is invalid', () => {
    assert.equal(
      postCanonicalUrl({ ...POST, json_metadata: { canonical_url: 'javascript:x', app: 'ecency/3.5.5-mobile' } }),
      'https://ecency.com/hive-167922/@alice/my-post'
    );
  });

  it('uses the url_scheme of a whitelisted publishing app', () => {
    const cases: [string, string][] = [
      ['peakd/2024.1.1', 'https://peakd.com/hive-167922/@alice/my-post'],
      ['hiveblog/0.1', 'https://hive.blog/hive-167922/@alice/my-post'],
      ['steemit/0.2', 'https://steemit.com/hive-167922/@alice/my-post'],
      ['esteem/2.0', 'https://ecency.com/hive-167922/@alice/my-post'],
      ['ecency/4.3.9-vision', 'https://ecency.com/hive-167922/@alice/my-post'],
      ['travelfeed/2.0', 'https://travelfeed.com/@alice/my-post'],
      ['leofinance/1.0', 'https://leofinance.io/hive-167922/@alice/my-post']
    ];
    for (const [app, expected] of cases) {
      assert.equal(postCanonicalUrl({ ...POST, json_metadata: { app } }), expected, app);
    }
  });

  it('uses the post path for an app outside the whitelist, one without a url_scheme or a malformed app', () => {
    for (const app of [
      'leothreads/0.3',
      'hive.blog/0.9',
      'denser/0.1',
      'hive/1.0',
      'steempeak/1.0',
      'peakd',
      'peakd/',
      '/1.0',
      'peakd/1.0/extra',
      'constructor/1.0',
      'PeakD/1.0',
      7,
      undefined
    ]) {
      assert.equal(postCanonicalUrl({ ...POST, json_metadata: { app } }), OWN_PATH, `app ${JSON.stringify(app)}`);
    }
  });

  it('uses the post path when there is no json_metadata', () => {
    assert.equal(postCanonicalUrl(POST), OWN_PATH);
    assert.equal(postCanonicalUrl({ ...POST, json_metadata: null }), OWN_PATH);
  });
});
