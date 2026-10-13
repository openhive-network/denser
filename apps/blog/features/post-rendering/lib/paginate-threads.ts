import type { Entry } from '@hive/common-hiveio-packages/wax';

export const MAX_COMMENTS_PER_PAGE = 50;

type ThreadEntry = Pick<Entry, 'author' | 'permlink' | 'parent_author' | 'parent_permlink' | 'depth'>;

export interface DiscussionPage<T extends ThreadEntry = Entry> {
  comments: T[];
  totalPages: number;
  currentPage: number;
  totalMainComments: number;
}

type EntryRef = Pick<Entry, 'author' | 'permlink'>;

// bridge.get_discussion no longer returns post_id, so author/permlink is the only stable identity.
export const getEntryKey = (entry: EntryRef) => `${entry.author}/${entry.permlink}`;

const getParentKey = (entry: ThreadEntry) => `${entry.parent_author}/${entry.parent_permlink}`;

const groupByParent = <T extends ThreadEntry>(entries: T[]) => {
  const repliesByParent = new Map<string, T[]>();
  for (const entry of entries) {
    const parentKey = getParentKey(entry);
    const replies = repliesByParent.get(parentKey);
    if (replies) {
      replies.push(entry);
    } else {
      repliesByParent.set(parentKey, [entry]);
    }
  }
  return repliesByParent;
};

const collectThreadKeys = <T extends ThreadEntry>(mainComment: T, repliesByParent: Map<string, T[]>): string[] => {
  const keys: string[] = [];
  const stack = [mainComment];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    const currentKey = getEntryKey(current);
    keys.push(currentKey);
    stack.push(...(repliesByParent.get(currentKey) ?? []));
  }
  return keys;
};

/**
 * Splits a sorted discussion into pages of whole threads: each page holds top-level replies to
 * `root` (in `sortedEntries` order) together with all of their descendants, and a thread is never
 * divided between pages, so every reply is on exactly one page. Pages hold at most
 * MAX_COMMENTS_PER_PAGE entries, except that a single thread larger than that gets a page of its
 * own. The discussion's depth-0 entry and `root` itself are on every page.
 */
export const paginateDiscussion = <T extends ThreadEntry>(
  sortedEntries: T[],
  root: ThreadEntry,
  page: number
): DiscussionPage<T> => {
  const repliesByParent = groupByParent(sortedEntries);
  const rootKey = getEntryKey(root);
  const mainComments = sortedEntries.filter(
    (comment) => comment.depth === root.depth + 1 && getParentKey(comment) === rootKey
  );

  const alwaysIncluded = new Set<string>([rootKey]);
  const mainPost = sortedEntries.find((entry) => entry.depth === 0);
  if (mainPost) alwaysIncluded.add(getEntryKey(mainPost));
  const baseCount = sortedEntries.filter((entry) => alwaysIncluded.has(getEntryKey(entry))).length;

  const pages: Set<string>[] = [];
  let currentPageKeys = new Set(alwaysIncluded);
  let currentPageCount = baseCount;

  for (const mainComment of mainComments) {
    const threadKeys = collectThreadKeys(mainComment, repliesByParent);

    if (
      currentPageCount + threadKeys.length > MAX_COMMENTS_PER_PAGE &&
      currentPageKeys.size > alwaysIncluded.size
    ) {
      pages.push(currentPageKeys);
      currentPageKeys = new Set(alwaysIncluded);
      currentPageCount = baseCount;
    }

    for (const key of threadKeys) currentPageKeys.add(key);
    currentPageCount += threadKeys.length;
  }

  if (currentPageKeys.size > alwaysIncluded.size) {
    pages.push(currentPageKeys);
  }

  const totalPages = Math.max(1, pages.length);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageKeys = pages[currentPage - 1] ?? alwaysIncluded;

  return {
    comments: sortedEntries.filter((entry) => pageKeys.has(getEntryKey(entry))),
    totalPages,
    currentPage,
    totalMainComments: mainComments.length
  };
};
