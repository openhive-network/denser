import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import env from '@beam-australia/react-env';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');


export function useVoteMutation() {
    const queryClient = useQueryClient();
    const voteMutation = useMutation({
        mutationFn: async (params: {
            voter: string,
            author: string,
            permlink: string,
            weight: number
        }) => {
            let { voter, author, permlink, weight } = params;

            // // Use in manual testing in development only!
            // if (env('DEVELOPMENT') === 'true') {
            //   if (weight > 0) {
            //     weight = 1;
            //   } else if (weight < 0) {
            //     weight = -1;
            //   }
            // }

            try {
                await transactionService.upVote(
                    author,
                    permlink,
                    weight,
                    (error) => { throw error; },
                    true
                );
                logger.info('Voted: %o',
                    { voter, author, permlink, weight });
            } catch (error) {
                transactionService.handleError(error);
                throw error;
            }
            return { voter, author, permlink, weight };
        },
        onSuccess: (data) => {
            logger.info('usevoteMutation onSuccess data: %o', data);
            const { voter, author, permlink } = data;
            queryClient.invalidateQueries(
                { queryKey: ['votes', author, permlink, voter] });
            queryClient.invalidateQueries(
                { queryKey: [permlink, voter, 'ActiveVotes'] });
            queryClient.invalidateQueries(
                { queryKey: ['postData', author, permlink] });
            queryClient.invalidateQueries(
                { queryKey: ['entriesInfinite'] });
        },
        onError: (error) => {
            throw error;
        }
    });
    return { voteMutation };
};


