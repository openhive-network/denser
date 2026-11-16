import { hiddenAuthorsApi, resolvePosts } from '@transaction/lib/bridge-api';
import { fetchHiddenAuthors } from '@transaction/lib/hidden-authors';
import { configuredFypApiUrl } from '@ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';
import type { CardEntry } from '@/blog/features/list-of-posts/lib/card-entry';
import { toCardEntries } from '@/blog/features/list-of-posts/lib/to-card-entries';
import { keepObserverVotes } from './feed-entries';
import { getFypFeedPage } from './fyp-api';

const logger = getLogger('app');

/**
 * How long the server waits for the feed before leaving it to the browser: a slow ranking should
 * not hold the whole document, and the browser shows its own progress and errors.
 */
const SERVER_FYP_TIMEOUT_MS = 3_000;

export interface IForYouFirstPage {
  /** Every post of the page, as the browser's read keeps them: its hidden authors are dropped as it renders */
  posts: CardEntry[];
  /** The authors whose posts the observer does not read */
  hiddenAuthors: string[];
}

/**
 * Page 1 of `account`'s For You feed as the server renders it: card entries with only the account's
 * own votes, cross-posts resolved as `observer`, and `observer`'s hidden authors.
 *
 * @returns null when the feed is off or either read fails; the browser then reads the feed itself
 */
export async function getForYouFirstPage(account: string, observer: string): Promise<IForYouFirstPage | null> {
  if (!configuredFypApiUrl) return null;
  const baseUrl = configuredFypApiUrl;
  try {
    // The lists are read once the feed has answered: without it they would be read for nothing
    const entries = await getFypFeedPage(baseUrl, account, 1, SERVER_FYP_TIMEOUT_MS);
    const [posts, hiddenAuthors] = await Promise.all([
      resolvePosts(entries, observer),
      fetchHiddenAuthors(observer, hiddenAuthorsApi)
    ]);
    return { posts: keepObserverVotes(toCardEntries(posts), account), hiddenAuthors: [...hiddenAuthors] };
  } catch (error) {
    // The page is not indexed and the browser's read has its own error state, so no 503 here
    logger.warn(error, 'For You: the first page of %s is left to the browser', account);
    return null;
  }
}
