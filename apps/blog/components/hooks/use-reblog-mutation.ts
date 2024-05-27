import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { PromiseTools } from '@transaction/lib/promise-tools';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');


export function useReblogMutation() {
    const queryClient = useQueryClient();
    const reblogMutation = useMutation({
      mutationFn: async (params: {
            author: string,
            permlink: string,
            username: string
          }) => {
        const { author, permlink, username } = params;
        try {
          // await transactionService.reblog(author, permlink,
          //   (error) => { throw error; }, true);
          logger.info('Reblogged: %o',
            { author, permlink, username });

          // TODO Remove line below, when observe works in
          // TranscationService.
          await PromiseTools.promiseTimeout(7000);

        } catch (error) {
          transactionService.handleError(error);
          throw error;
        }
        return { author, permlink, username };
      },
      onSuccess: (data) => {
        logger.info('useReblogMutation onSuccess data: %o', data);
        const { author, permlink, username } = data;
        queryClient.invalidateQueries(
          { queryKey: ['PostRebloggedBy', author, permlink, username] });
        // queryClient.invalidateQueries(
        //   { queryKey: [data.permlink, data.voter, 'ActiveVotes'] });
        // queryClient.invalidateQueries(
        //   { queryKey: ['postData', data.author, data.permlink ] });
        // queryClient.invalidateQueries(
        //   { queryKey: ['entriesInfinite'] });
      },
      onError: (error) => {
        throw error;
      }
    });
    return reblogMutation;
  };
