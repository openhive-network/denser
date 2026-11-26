import { isPostDeletedError } from '@transaction/lib/deleted-post';
import { getPostCached } from '@/blog/lib/cached-api';

// A deleted post has no category left to read, and the post page reads a post by author and
// permlink whatever category its URL names, so any one serves it; this one says what is there.
const DELETED_POST_CATEGORY = 'deleted';

/** The post page path `/@author/permlink` sends a deleted post to. */
export const deletedPostPath = (author: string, permlink: string): string =>
  `/${DELETED_POST_CATEGORY}/@${author}/${permlink}`;

/**
 * Whether hivemind answers that the post was deleted by its author. False when it is there, never
 * existed or could not be read: the post page tells those apart itself.
 */
export async function isPostDeleted(author: string, permlink: string, observer: string): Promise<boolean> {
  try {
    await getPostCached(author, permlink, observer);
    return false;
  } catch (error) {
    return isPostDeletedError(error);
  }
}
