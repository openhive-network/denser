import { Entry } from '@hive/common-hiveio-packages/wax';
import sorter, { SortOrder } from '@/blog/lib/sorter';

export const MAX_COMMENTS_PER_PAGE = 50;

// Upper bound of direct replies counted when estimating whether a top-level comment's thread fits a page
const MAX_ESTIMATED_DIRECT_REPLIES = 10;

export interface DiscussionPage {
  comments: Entry[];
  totalPages: number;
  currentPage: number;
  totalMainComments: number;
}

/**
 * The first comments page of a discussion, computed on the server so the post page's HTML and
 * hydration data carry only that page. `entries` is a subset of the bridge.get_discussion record;
 * `totalPages` and `totalMainComments` describe the whole discussion.
 */
export interface DiscussionPageSeed {
  entries: Record<string, Entry>;
  sort: SortOrder;
  totalPages: number;
  totalMainComments: number;
}

type EntryRef = Pick<Entry, 'author' | 'permlink'>;

// bridge.get_discussion no longer returns post_id, so author/permlink is the only stable identity.
export const getEntryKey = (entry: EntryRef) => `${entry.author}/${entry.permlink}`;

const getParentKey = (entry: Entry) => `${entry.parent_author}/${entry.parent_permlink}`;

const byCreatedAscending = (a: Entry, b: Entry) => new Date(a.created).getTime() - new Date(b.created).getTime();

export const parseCommentSort = (value: string | null | undefined): SortOrder =>
  Object.values(SortOrder).find((order) => order === value) ?? SortOrder.trending;

export const sortDiscussion = (discussion: Record<string, Entry>, sort: SortOrder): Entry[] => {
  const list = Object.values(discussion);
  sorter(list, sort);
  return list;
};

const groupByParent = (entries: Entry[]) => {
  const repliesByParent = new Map<string, Entry[]>();
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

/**
 * Splits a sorted discussion into pages of at most MAX_COMMENTS_PER_PAGE entries. Each page holds
 * whole top-level replies to `root` (in `sortedEntries` order) plus as many of their descendants,
 * oldest first, as still fit. The discussion's depth-0 entry and `root` itself are on every page.
 */
export const paginateDiscussion = (sortedEntries: Entry[], root: Entry, page: number): DiscussionPage => {
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
    const directReplies = repliesByParent.get(getEntryKey(mainComment)) ?? [];
    const estimatedCount = 1 + Math.min(directReplies.length, MAX_ESTIMATED_DIRECT_REPLIES);

    if (
      currentPageCount + estimatedCount > MAX_COMMENTS_PER_PAGE &&
      currentPageKeys.size > alwaysIncluded.size
    ) {
      pages.push(currentPageKeys);
      currentPageKeys = new Set(alwaysIncluded);
      currentPageCount = baseCount;
    }

    if (currentPageCount >= MAX_COMMENTS_PER_PAGE) continue;

    currentPageKeys.add(getEntryKey(mainComment));
    currentPageCount++;

    const queue: Entry[] = [...directReplies].sort(byCreatedAscending);
    while (queue.length > 0 && currentPageCount < MAX_COMMENTS_PER_PAGE) {
      const current = queue.shift();
      if (!current) break;
      const currentKey = getEntryKey(current);
      if (currentPageKeys.has(currentKey)) continue;

      currentPageKeys.add(currentKey);
      currentPageCount++;
      queue.push(...[...(repliesByParent.get(currentKey) ?? [])].sort(byCreatedAscending));
    }
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

/** Builds the seed for the first comments page of `discussion` in `sort` order. */
export const buildDiscussionPageSeed = (
  discussion: Record<string, Entry>,
  root: Entry,
  sort: SortOrder
): DiscussionPageSeed => {
  const firstPage = paginateDiscussion(sortDiscussion(discussion, sort), root, 1);
  const firstPageKeys = new Set(firstPage.comments.map(getEntryKey));
  const entries = Object.fromEntries(
    Object.entries(discussion).filter(([, entry]) => firstPageKeys.has(getEntryKey(entry)))
  );
  return {
    entries,
    sort,
    totalPages: firstPage.totalPages,
    totalMainComments: firstPage.totalMainComments
  };
};
