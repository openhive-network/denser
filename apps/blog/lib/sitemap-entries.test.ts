import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { buildSitemap } = await import('./sitemap-entries.ts');

describe('buildSitemap', () => {
  it('lists the main feeds, the static pages and each community once, as absolute URLs', () => {
    const urls = buildSitemap('https://example.org/blog/', ['hive-167922', 'hive-1', 'hive-167922']).map(
      (entry) => entry.url
    );
    assert.deepEqual(urls, [
      'https://example.org/blog/',
      'https://example.org/blog/trending',
      'https://example.org/blog/hot',
      'https://example.org/blog/created',
      'https://example.org/blog/payout',
      'https://example.org/blog/communities',
      'https://example.org/blog/welcome',
      'https://example.org/blog/faq.html',
      'https://example.org/blog/tos.html',
      'https://example.org/blog/privacy.html',
      'https://example.org/blog/trending/hive-167922',
      'https://example.org/blog/trending/hive-1'
    ]);
  });

  it('leaves out a community name that is not hive-<number>', () => {
    const urls = buildSitemap('https://hive.blog', ['hive-1', '../evil', 'hive-2<x>', '']).map(
      (entry) => entry.url
    );
    assert.deepEqual(urls.slice(-1), ['https://hive.blog/trending/hive-1']);
    assert.equal(urls.filter((url) => url.includes('/trending/hive-')).length, 1);
  });
});
