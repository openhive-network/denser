import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { joinSiteUrl } from './site-url.ts';

describe('joinSiteUrl', () => {
  const cases: [string, string, string][] = [
    ['https://h', '/login', 'https://h/login'],
    ['https://h/', '/login', 'https://h/login'],
    ['https://h/blog', '/login', 'https://h/blog/login'],
    ['https://h/blog/', '/login', 'https://h/blog/login'],
    ['https://h/blog', 'login', 'https://h/blog/login'],
    ['https://h/blog', '/api/oauth/authorize', 'https://h/blog/api/oauth/authorize'],
    ['http://localhost:3000/a/b/', '/login', 'http://localhost:3000/a/b/login']
  ];

  for (const [siteUrl, path, expected] of cases) {
    it(`resolves ${path} against ${siteUrl}`, () => {
      assert.equal(joinSiteUrl(siteUrl, path).toString(), expected);
    });
  }

  it('keeps a query string on the path', () => {
    assert.equal(
      joinSiteUrl('https://h/blog', '/login?oauth_return=true').toString(),
      'https://h/blog/login?oauth_return=true'
    );
  });
});
