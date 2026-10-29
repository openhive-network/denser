import type { IJsonLdNode } from './json-ld.ts';
import type { IPostSeo } from './post-seo.ts';
import { absoluteSiteUrl } from './site-url.ts';

const SCHEMA_CONTEXT = 'https://schema.org';
const SITE_NAME = 'Hive';
const SEARCH_TERM = 'search_term_string';

/** The profile fields a `ProfilePage` is built from. */
export interface IProfileSeo {
  username: string;
  /** The account's display name; the username when it has none. */
  name?: string;
  about?: string;
  image?: string;
  /** ISO 8601. */
  created?: string;
}

/** `Article` of a post page. Hive posts range from long-form blogs to short threads, so not `BlogPosting`. */
export function articleJsonLd(post: IPostSeo): IJsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'Article',
    headline: post.title,
    description: post.description || undefined,
    image: [post.image],
    datePublished: post.published,
    dateModified: post.modified,
    author: { '@type': 'Person', name: post.author, url: post.authorUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.url },
    articleSection: post.section.name,
    keywords: post.tags.join(', ')
  };
}

/** `BreadcrumbList` of a post page: Home > community or tag > post. */
export function postBreadcrumbJsonLd(post: IPostSeo, siteUrl?: string): IJsonLdNode {
  const crumbs = [
    { name: SITE_NAME, item: absoluteSiteUrl('/', siteUrl) },
    { name: post.section.name, item: post.section.url },
    { name: post.title, item: post.url }
  ];
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb }))
  };
}

/** `ProfilePage` of an account, its `Person` the main entity. */
export function profilePageJsonLd(profile: IProfileSeo, siteUrl?: string): IJsonLdNode {
  const url = absoluteSiteUrl(`/@${profile.username}`, siteUrl);
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'ProfilePage',
    url,
    dateCreated: profile.created,
    mainEntity: {
      '@type': 'Person',
      name: profile.name || profile.username,
      alternateName: `@${profile.username}`,
      identifier: profile.username,
      description: profile.about || undefined,
      image: profile.image || undefined,
      url
    }
  };
}

/** `WebSite` of the whole site, with a `SearchAction` for its search page. */
export function websiteJsonLd(siteUrl?: string): IJsonLdNode {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteSiteUrl('/', siteUrl),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: absoluteSiteUrl(`/search?q={${SEARCH_TERM}}`, siteUrl) },
      'query-input': `required name=${SEARCH_TERM}`
    }
  };
}
