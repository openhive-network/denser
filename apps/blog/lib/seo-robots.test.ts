import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { buildRobots } = await import('./seo-robots.ts');

describe('buildRobots', () => {
  it('disallows everything, with no sitemap, while indexing is off', () => {
    assert.deepEqual(buildRobots({ allowIndexing: false, siteUrl: 'https://hive.blog', basePath: '' }), {
      rules: { userAgent: '*', disallow: '/' }
    });
  });

  it('allows public pages, disallows the user-specific ones and /api/, and points at the sitemap', () => {
    const robots = buildRobots({ allowIndexing: true, siteUrl: 'https://hive.blog/', basePath: '' });
    assert.equal(robots.sitemap, 'https://hive.blog/sitemap.xml');
    assert.ok(!Array.isArray(robots.rules));
    assert.equal(robots.rules.allow, '/');
    const disallow = robots.rules.disallow;
    assert.ok(Array.isArray(disallow));
    for (const rule of [
      '/@*/feed$',
      '/@*/communities$',
      '/@*/settings$',
      '/@*/notifications?',
      '/trending/my$',
      '/search$',
      '/search?',
      '/submit.html$',
      '/login$',
      '/api/'
    ]) {
      assert.ok(disallow.includes(rule), `disallows ${rule}`);
    }
    assert.ok(!disallow.includes('/'));
    assert.ok(!disallow.includes('/search'), 'a bare prefix would also block /searchx');
  });

  it('puts the base path in front of every rule and in the sitemap URL', () => {
    const robots = buildRobots({
      allowIndexing: true,
      siteUrl: 'https://example.org/blog',
      basePath: '/blog'
    });
    assert.equal(robots.sitemap, 'https://example.org/blog/sitemap.xml');
    assert.ok(!Array.isArray(robots.rules));
    assert.equal(robots.rules.allow, '/blog/');
    const disallow = robots.rules.disallow;
    assert.ok(Array.isArray(disallow));
    assert.ok(disallow.includes('/blog/api/'));
    assert.ok(disallow.every((rule) => rule.startsWith('/blog/')));
  });
});
