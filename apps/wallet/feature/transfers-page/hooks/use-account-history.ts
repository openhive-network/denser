import { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { HiveOperation, IGetOperationsByAccountResponse } from '@hive/common-hiveio-packages/wax';
import { getAccountOperations } from '@/wallet/lib/hive';
import { handleError } from '@ui/lib/handle-error';

/** Operations per history request: a small page keeps the slow filtered query within its timeout. */
export const ACCOUNT_HISTORY_PAGE_SIZE = 100;

type AccountHistoryPage = IGetOperationsByAccountResponse & { page: number };

export interface IAccountHistory {
  /** Every loaded operation, newest first. */
  operations: HiveOperation[] | undefined;
  isLoading: boolean;
  isError: boolean;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  loadOlder: () => void;
  /** Repeats the failed request: the first page, or the older page that could not be loaded. */
  retry: () => void;
}

/**
 * The account's wallet operations, a page at a time. The API numbers pages from the oldest (1), and
 * without a page number answers with the newest one, so each older page is the previous number.
 */
export const useAccountHistory = (username: string, observer: string): IAccountHistory => {
  const query = useInfiniteQuery(
    ['Operations', username],
    async ({ pageParam }: { pageParam?: number }): Promise<AccountHistoryPage> => {
      const response = await getAccountOperations(username, pageParam, ACCOUNT_HISTORY_PAGE_SIZE, observer);
      return { ...response, page: pageParam ?? response.total_pages };
    },
    {
      getNextPageParam: ({ page }) => (page > 1 ? page - 1 : undefined),
      retry: false,
      refetchOnWindowFocus: false,
      onError: (error: unknown) => {
        handleError(error, { method: 'getAccountOperations', params: { username } });
      }
    }
  );
  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const operations = useMemo(() => data?.pages.flatMap(({ operations_result }) => operations_result), [data]);
  const loadOlder = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const retry = useCallback(() => void (data ? fetchNextPage() : refetch()), [data, fetchNextPage, refetch]);

  return {
    operations,
    isLoading,
    isError,
    hasOlder: Boolean(hasNextPage),
    isFetchingOlder: isFetchingNextPage,
    loadOlder,
    retry
  };
};
