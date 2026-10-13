import { Entry } from '@hive/common-hiveio-packages/wax';
import sorter, { SortOrder } from '@/blog/lib/sorter';
import { getEntryKey, paginateDiscussion } from './paginate-threads';

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

export const parseCommentSort = (value: string | null | undefined): SortOrder =>
  Object.values(SortOrder).find((order) => order === value) ?? SortOrder.trending;

export const sortDiscussion = (discussion: Record<string, Entry>, sort: SortOrder): Entry[] => {
  const list = Object.values(discussion);
  sorter(list, sort);
  return list;
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
