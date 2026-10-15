/** Editor category value meaning "My blog": the post belongs to no community. */
const MY_BLOG_CATEGORY = 'blog';

/**
 * The category a top-level post is broadcast with (its `parent_permlink`):
 * the community name, or the first tag for a "My blog" post.
 */
export function getPostCategory(category: string, tags: string[]): string {
  return category !== MY_BLOG_CATEGORY ? category : tags[0];
}

/** The canonical `/<category>/@<author>/<permlink>` path of a top-level post. */
export function getPostPath(author: string, permlink: string, category: string, tags: string[]): string {
  return `/${getPostCategory(category, tags)}/@${author}/${permlink}`;
}
