import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import type { Entry } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { transactionService } from '@transaction/index';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CircleSpinner } from 'react-spinners-kit';
import { getListVotesByCommentVoter } from '@transaction/lib/hive';
import env from '@beam-australia/react-env';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');


export function usePostUpdateVoteMutation() {
  const queryClient = useQueryClient();
  const postUpdateVoteMutation = useMutation({
    mutationFn: async (params: {
          voter: string,
          author: string,
          permlink: string,
          weight: number
        }) => {
      let { voter, author, permlink, weight } = params;

      // Use in manual testing in development only!
      if (env('DEVELOPMENT') === 'true') {
        if (weight > 0) {
          weight = 1;
        } else if (weight < 0) {
          weight = -1;
        }
      }

      try {
        await transactionService.upVote(author, permlink, weight,
          (error) => { throw error; }, true);
        logger.info('Voted: %o',
          { voter, author, permlink, weight });
      } catch (error) {
        transactionService.handleError(error);
        throw error;
      }
      return { voter, author, permlink, weight };
    },
    onSuccess: (data) => {
      logger.info('usePostUpdateVoteMutation onSuccess data: %o', data);
      queryClient.invalidateQueries(
        { queryKey: ['votes', data.author, data.permlink, data.voter] });
      queryClient.invalidateQueries(
        { queryKey: [data.permlink, data.voter, 'ActiveVotes'] });
      queryClient.invalidateQueries(
        { queryKey: ['postData', data.author, data.permlink ] });
      queryClient.invalidateQueries(
        { queryKey: ['entriesInfinite'] });
    },
    onError: (error) => {
      throw error;
    }
  });
  return postUpdateVoteMutation;
};


const VotesComponent = ({ post }: { post: Entry }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  const [clickedVoteButton, setClickedVoteButton] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);
  const checkVote = isClient
    && post.active_votes.find((e) => e.voter === user?.username);

  const { data: userVotes } = useQuery(
    ['votes', post.author, post.permlink, user?.username],
    () => getListVotesByCommentVoter(
      [post.author, post.permlink, user?.username], 1),
    {
      enabled: !!checkVote || !!clickedVoteButton
    }
  );

  const userVote = userVotes?.votes[0]
      && userVotes?.votes[0].voter === user.username
    ? userVotes.votes[0]
    : undefined;

  const postUpdateVoteMutation = usePostUpdateVoteMutation();

  const submitVote = async (weight: number) => {
    const { author, permlink } = post;
    const voter = user.username;
    try {
      await postUpdateVoteMutation.mutateAsync(
        { voter, author, permlink, weight }
      );
    } catch (error) {
      logger.error('Error: %o', error);
    }
  }

  return (
    <div className="flex items-center gap-1">

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger data-testid="upvote-button" disabled={postUpdateVoteMutation.isLoading}>
              {clickedVoteButton === 'up' && postUpdateVoteMutation.isLoading
              ?
                <CircleSpinner loading={clickedVoteButton === 'up' && postUpdateVoteMutation.isLoading}
                              size={18} color="#dc2626" />
              :
                user && user.isLoggedIn
                ?
                  <Icons.arrowUpCircle
                    className={clsx(
                      'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
                      { 'bg-red-600 text-white': userVote && userVote.vote_percent > 0 },
                    )}
                    onClick={(e) => {
                      if (postUpdateVoteMutation.isLoading) return;
                      setClickedVoteButton('up');
                      {
                        // We vote either 100% or 0%.
                        if (userVote && userVote.vote_percent > 0) {
                          submitVote(0);
                        } else {
                          submitVote(10000);
                        }
                      }
                    }}
                  />
                :
                  <DialogLogin>
                    <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                  </DialogLogin>
              }
            </TooltipTrigger>
            <TooltipContent data-testid="upvote-button-tooltip">
              {
                userVote && userVote.vote_percent > 0
                  ? userVote.vote_percent === 10000
                    ? t('cards.post_card.undo_upvote')
                    : t('cards.post_card.undo_upvote_percent', { votePercent: (userVote.vote_percent / 100).toFixed(2) })
                  : t('cards.post_card.upvote')
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="downvote-button" disabled={postUpdateVoteMutation.isLoading}>
            {clickedVoteButton === 'down' && postUpdateVoteMutation.isLoading
            ?
              <CircleSpinner loading={clickedVoteButton === 'down' && postUpdateVoteMutation.isLoading}
                            size={18} color="#dc2626" />
            :
              user && user.isLoggedIn
              ?
                <Icons.arrowDownCircle
                  className={clsx(
                    'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
                    { 'bg-gray-600 text-white': userVote && userVote.vote_percent < 0 },
                  )}
                  onClick={(e) => {
                    if (postUpdateVoteMutation.isLoading) return;
                    setClickedVoteButton('down');
                    {
                      // We vote either -100% or 0%.
                      if (userVote && userVote.vote_percent < 0) {
                        submitVote(0);
                      } else {
                        submitVote(-10000);
                      }
                    }
                  }}
                />
              :
                <DialogLogin>
                  <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                </DialogLogin>
            }
          </TooltipTrigger>
          <TooltipContent data-testid="downvote-button-tooltip">
              {
                userVote && userVote.vote_percent < 0
                  ? userVote.vote_percent === -10000
                    ? t('cards.post_card.undo_downvote')
                    : t('cards.post_card.undo_downvote_percent', { votePercent: (- userVote.vote_percent / 100).toFixed(2) })
                  : t('cards.post_card.downvote')
              }
            </TooltipContent>
        </Tooltip>
      </TooltipProvider>

    </div>
  );
};

export default VotesComponent;
