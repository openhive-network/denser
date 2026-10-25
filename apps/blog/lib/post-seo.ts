import type { Entry } from '@hive/common-hiveio-packages/wax';
import { postCanonicalUrl } from './canonical-url.ts';
import { absoluteSiteUrl } from './site-url.ts';

const DEFAULT_SHARE_IMAGE = 'https://hive.blog/images/hive-blog-share.png';
const DESCRIPTION_LENGTH = 160;
const HAS_TIME_ZONE = /(Z|[+-]\d\d:?\d\d)$/i;

type SeoMetadataField = 'image' | 'images' | 'tags' | 'summary' | 'description' | 'app' | 'canonical_url';

/** The fields of a post (a bridge `Entry`) its SEO data is derived from. */
export type SeoPost = Pick<
  Entry,
  | 'author'
  | 'permlink'
  | 'category'
  | 'title'
  | 'body'
  | 'created'
  | 'updated'
  | 'community'
  | 'community_title'
> & {
  // Whatever JSON the posting app wrote: typed as unknown, read only through type checks.
  json_metadata?: Partial<Record<SeoMetadataField, unknown>> | null;
};

/** What a post page tells crawlers and link previews about the post. */
export interface IPostSeo {
  /** The canonical URL, absolute. */
  url: string;
  title: string;
  description: string;
  image: string;
  author: string;
  authorUrl: string;
  /** ISO 8601; undefined when the chain time doesn't parse. */
  published?: string;
  modified?: string;
  /** The community the post is in, else its category. */
  section: { name: string; url: string };
  tags: string[];
}

/** A chain timestamp (UTC, written without a zone: `2024-05-01T12:00:00`) as ISO 8601. */
export function hiveTimeToIso(time: string | undefined): string | undefined {
  if (!time) return undefined;
  const date = new Date(HAS_TIME_ZONE.test(time) ? time : `${time}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function firstString(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first ? first : undefined;
}

function postTags(post: SeoPost): string[] {
  const tags = post.json_metadata?.tags;
  const valid = Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string' && !!tag)
    : [];
  return [...new Set(valid.length ? valid : [post.category])];
}

function postDescription(post: SeoPost): string {
  const metadata = post.json_metadata;
  return (
    firstString(metadata?.summary) ||
    firstString(metadata?.description) ||
    (post.body ? post.body.substring(0, DESCRIPTION_LENGTH) : '')
  );
}

/** The SEO fields of a post, its site-relative URLs made absolute against `siteUrl`. */
export function postSeo(post: SeoPost, siteUrl?: string): IPostSeo {
  const metadata = post.json_metadata;
  const sectionTag = post.community || post.category;
  return {
    url: absoluteSiteUrl(postCanonicalUrl(post), siteUrl),
    title: post.title,
    description: postDescription(post),
    image: firstString(metadata?.image) || firstString(metadata?.images) || DEFAULT_SHARE_IMAGE,
    author: post.author,
    authorUrl: absoluteSiteUrl(`/@${post.author}`, siteUrl),
    published: hiveTimeToIso(post.created),
    modified: hiveTimeToIso(post.updated),
    section: {
      name: (post.community && post.community_title) || sectionTag,
      url: absoluteSiteUrl(`/trending/${sectionTag}`, siteUrl)
    },
    tags: postTags(post)
  };
}
