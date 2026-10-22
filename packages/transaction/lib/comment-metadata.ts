import { isJsonObject, parseJsonObject, type JsonObject } from './json-object';
import { PUBLISHING_APP } from './publishing-app';

/** What a comment body references (the shape `extractContentMetadata` of `@hive/renderer` returns). */
export interface CommentBodyMetadata {
  hashtags: string[];
  usertags: string[];
  images: string[];
  links: string[];
}

// condenser ReplyEditor.jsx: MAX_TAGS, and `meta.links = Array.from(rtags.links).slice(0, 1)`
const MAX_TAGS = 8;
const MAX_LINKS = 1;

// Without an explicit format wax writes its default, `markdown+html`
const COMMENT_FORMAT = 'markdown';

// Keys a comment broadcast owns: an absent value removes the key instead of keeping the old one.
const MANAGED_COMMENT_KEYS = ['tags', 'users', 'image', 'links', 'app', 'format'];

function toJsonObject(current: unknown): JsonObject {
  if (typeof current === 'string') return parseJsonObject(current);
  return isJsonObject(current) ? { ...current } : {};
}

/**
 * The json_metadata to broadcast with a comment, following condenser's ReplyEditor for a
 * reply: `tags` are the body's hashtags (at most 8), `users` the mentioned accounts, `image`
 * the body's images, `links` its first link; an empty one is omitted. `app` and `format`
 * are denser's. `current` is the edited comment's json_metadata (string or parsed object):
 * its keys outside those above are kept.
 */
export function buildCommentJsonMetadata(content: CommentBodyMetadata, current?: unknown): JsonObject {
  const metadata = toJsonObject(current);
  for (const key of MANAGED_COMMENT_KEYS) delete metadata[key];
  const tags = content.hashtags.slice(0, MAX_TAGS);
  if (tags.length) metadata.tags = tags;
  if (content.usertags.length) metadata.users = [...content.usertags];
  if (content.images.length) metadata.image = [...content.images];
  if (content.links.length) metadata.links = content.links.slice(0, MAX_LINKS);
  metadata.app = PUBLISHING_APP;
  metadata.format = COMMENT_FORMAT;
  return metadata;
}
