import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { postSeo, hiveTimeToIso } = await import('./post-seo.ts');
const { articleJsonLd, postBreadcrumbJsonLd, profilePageJsonLd, websiteJsonLd } = await import(
  './structured-data.ts'
);

const SITE = 'https://example.org/blog';

const POST = {
  author: 'alice',
  permlink: 'my-post',
  category: 'hive-167922',
  title: 'My post',
  body: 'Body text',
  created: '2024-05-01T12:00:00',
  updated: '2024-05-02T08:30:00',
  community: 'hive-167922',
  community_title: 'LeoFinance',
  json_metadata: { tags: ['hive-167922', 'finance', 42, 'finance'], image: ['https://img.example/a.png'] }
};

describe('postSeo', () => {
  it('derives absolute URLs, ISO dates, the community section and string tags', () => {
    const seo = postSeo(POST, SITE);
    assert.equal(seo.url, 'https://example.org/blog/hive-167922/@alice/my-post');
    assert.equal(seo.authorUrl, 'https://example.org/blog/@alice');
    assert.equal(seo.published, '2024-05-01T12:00:00.000Z');
    assert.equal(seo.modified, '2024-05-02T08:30:00.000Z');
    assert.deepEqual(seo.section, {
      name: 'LeoFinance',
      url: 'https://example.org/blog/trending/hive-167922'
    });
    assert.deepEqual(seo.tags, ['hive-167922', 'finance']);
    assert.equal(seo.image, 'https://img.example/a.png');
    assert.equal(seo.description, 'Body text');
  });

  it('keeps an external canonical URL and falls back to the category without a community', () => {
    const seo = postSeo(
      {
        ...POST,
        category: 'photography',
        community: undefined,
        community_title: undefined,
        json_metadata: { canonical_url: 'https://peakd.com/x/@alice/my-post' }
      },
      SITE
    );
    assert.equal(seo.url, 'https://peakd.com/x/@alice/my-post');
    assert.deepEqual(seo.section, {
      name: 'photography',
      url: 'https://example.org/blog/trending/photography'
    });
    assert.deepEqual(seo.tags, ['photography']);
    assert.equal(seo.image, 'https://hive.blog/images/hive-blog-share.png');
  });
});

describe('hiveTimeToIso', () => {
  it('reads a zoneless chain time as UTC and rejects garbage', () => {
    assert.equal(hiveTimeToIso('2024-05-01T12:00:00'), '2024-05-01T12:00:00.000Z');
    assert.equal(hiveTimeToIso('2024-05-01T12:00:00Z'), '2024-05-01T12:00:00.000Z');
    assert.equal(hiveTimeToIso('not a date'), undefined);
    assert.equal(hiveTimeToIso(undefined), undefined);
  });
});

describe('JSON-LD builders', () => {
  it('builds an Article of the post', () => {
    const article = articleJsonLd(postSeo(POST, SITE));
    assert.equal(article['@type'], 'Article');
    assert.equal(article.headline, 'My post');
    assert.equal(article.datePublished, '2024-05-01T12:00:00.000Z');
    assert.deepEqual(article.author, {
      '@type': 'Person',
      name: 'alice',
      url: 'https://example.org/blog/@alice'
    });
    assert.deepEqual(article.mainEntityOfPage, {
      '@type': 'WebPage',
      '@id': 'https://example.org/blog/hive-167922/@alice/my-post'
    });
  });

  it('builds the Home > community > post breadcrumb', () => {
    const breadcrumb = postBreadcrumbJsonLd(postSeo(POST, SITE), SITE);
    assert.deepEqual(breadcrumb.itemListElement, [
      { '@type': 'ListItem', position: 1, name: 'Hive', item: 'https://example.org/blog/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'LeoFinance',
        item: 'https://example.org/blog/trending/hive-167922'
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'My post',
        item: 'https://example.org/blog/hive-167922/@alice/my-post'
      }
    ]);
  });

  it('builds a ProfilePage whose Person falls back to the username', () => {
    const page = profilePageJsonLd({ username: 'bob' }, SITE);
    assert.equal(page['@type'], 'ProfilePage');
    assert.equal(page.url, 'https://example.org/blog/@bob');
    assert.deepEqual(page.mainEntity, {
      '@type': 'Person',
      name: 'bob',
      alternateName: '@bob',
      identifier: 'bob',
      description: undefined,
      image: undefined,
      url: 'https://example.org/blog/@bob'
    });
  });

  it('builds a WebSite whose SearchAction targets the search page', () => {
    const site = websiteJsonLd(SITE);
    assert.equal(site.url, 'https://example.org/blog/');
    assert.deepEqual(site.potentialAction, {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://example.org/blog/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    });
  });
});
