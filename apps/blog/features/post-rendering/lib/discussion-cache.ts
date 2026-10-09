import type { MutableRefObject } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { Entry } from '@hive/common-hiveio-packages/wax';

export type Discussion = Record<string, Entry>;
export type DiscussionParams = { discussionAuthor: string; discussionPermlink: string; observer: string };

export const discussionKey = ({ discussionAuthor, discussionPermlink, observer }: DiscussionParams) => [
  'discussionData',
  discussionAuthor,
  discussionPermlink,
  observer
];

export const fetchDiscussion = ({ discussionAuthor, discussionPermlink, observer }: DiscussionParams) =>
  getDiscussion(discussionAuthor, discussionPermlink, observer);

/** Stops the previous validated refetch and in-flight fetches so neither overwrites the optimistic write. */
export async function snapshotDiscussion(
  queryClient: QueryClient,
  params: DiscussionParams,
  cleanupRef: MutableRefObject<(() => void) | null>
) {
  const queryKey = discussionKey(params);
  cleanupRef.current?.();
  cleanupRef.current = null;
  await queryClient.cancelQueries({ queryKey });
  return { prevData: queryClient.getQueryData<Discussion>(queryKey), queryKey };
}

export function restoreDiscussion(
  queryClient: QueryClient,
  context?: { prevData?: Discussion; queryKey: QueryKey }
) {
  if (context?.prevData) queryClient.setQueryData(context.queryKey, context.prevData);
}

/** Applies `update` to the snapshotted discussion, when there is one. */
export function updateDiscussion(
  queryClient: QueryClient,
  { prevData, queryKey }: { prevData?: Discussion; queryKey: QueryKey },
  update: (entries: [string, Entry][]) => [string, Entry][]
) {
  if (prevData)
    queryClient.setQueryData<Discussion>(queryKey, Object.fromEntries(update(Object.entries(prevData))));
}
