// The feed pages' paging alone: the feeds import it eagerly, the FYP client (fyp-api.ts) only
// loads with the first For You page.

/** Posts per page of the For You feed; a shorter page is its last one. */
export const FYP_PAGE_SIZE = 20;

/**
 * The page after `pageNumber`, whose posts were `lastPage`; undefined when `lastPage` was short,
 * the end of the feed.
 */
export function nextFypPage(lastPage: readonly unknown[], pageNumber: number): number | undefined {
  return lastPage.length < FYP_PAGE_SIZE ? undefined : pageNumber + 1;
}
