import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import env from '@beam-australia/react-env';

import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';
import { transformError } from '@transaction/lib/utils';
const logger = getLogger('app');

/**
 * Makes vote transaction.
 *
 * See [TanStack Query
 * mutations](https://tanstack.com/query/v4/docs/framework/react/guides/mutations)
 *
 * @export
 * @return {*}
 */
export function useVoteMutation() {
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: async (params: { voter: string; author: string; permlink: string; weight: number }) => {
      let { voter, author, permlink, weight } = params;

      // // Use in manual testing in development only!
      // if (env('DEVELOPMENT') === 'true') {
      //   if (weight > 0) {
      //     weight = 1;
      //   } else if (weight < 0) {
      //     weight = -1;
      //   }
      // }

      await transactionService.upVote(
        author,
        permlink,
        weight,
        (error) => {
          // Get error description based on given error param
          const description = transformError(error, { method: 'upVote', ...params });

          toast({
            description,
            variant: 'destructive'
          });

          // Throwing the error now is a crucial thing for
          // @tanstack/react-query, which should know that
          // mutation finished with error.
          throw error;
        },
        true
      );
      logger.info('Voted: %o', { voter, author, permlink, weight });
      return { voter, author, permlink, weight };
    },
    onSuccess: (data) => {
      logger.info('useVoteMutation onSuccess data: %o', data);
      const { voter, author, permlink } = data;
      // We need to invalidate queries, that can be affected by
      // mutation. This tells @tanstack/react-query, that it
      // should refetch data for these queries.
      queryClient.invalidateQueries({ queryKey: ['votes', author, permlink, voter] });
      queryClient.invalidateQueries({ queryKey: [permlink, voter, 'ActiveVotes'] });
      queryClient.invalidateQueries({ queryKey: ['postData', author, permlink] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
    }
  });
  return voteMutation;
}
