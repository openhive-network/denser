import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import type { Entry } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { TransactionServiceThrowingError, TransactionErrorHandlingMode } from '@transaction/index';
import { PromiseTools } from '@transaction/lib/promise-tools'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CircleSpinner } from 'react-spinners-kit';
import { useSigner } from '@smart-signer/lib/use-signer';
import { getListVotesByCommentVoter } from '@transaction/lib/hive';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const transactionServiceThrowingError =
  new TransactionServiceThrowingError(
    TransactionErrorHandlingMode.OnlyThrow
  );

const vote = async (
      service: TransactionServiceThrowingError,
      voter: string,
      author: string,
      permlink: string,
      weight: number,
      t: any // translate function
    ) => {
  const pollingErrorMessage =
    "Failure in checking if user's vote has been included.";
  try {

    // FIXME Delete this!
    if (weight > 0) {
      weight = 1;
    } else if (weight < 0) {
      weight = -1;
    }

    // Get the newest num_changes for the vote. `numChangesBefore = -1`
    // means vote that does not exist yet (current voter hasn't voted
    // yet on this subject).
    let numChangesBefore = -1;
    const votesListBefore =
      await getListVotesByCommentVoter([author, permlink, voter], 1);
    if (votesListBefore
        && votesListBefore.votes.length > 0
        && votesListBefore.votes[0].voter === voter
      ) {
      numChangesBefore = votesListBefore.votes[0].num_changes;
    }
    // Vote now
    await service.upVote(author, permlink, weight);
    logger.info('Voted: %o',
      { voter, author, permlink, weight, numChangesBefore });

    // Check if `num_changes` is greater than before.
    let counter = 0;
    const checkVoteSaved = async () => {
      const getVoteListArgs: [string, string, string] =
        [author, permlink, voter];
      const votesList =
        await getListVotesByCommentVoter(getVoteListArgs, 1);
      ++counter;
      logger.info('checkVoteSaved try: #%s for: %o ',
          counter, getVoteListArgs);
      if (votesList && votesList.votes.length > 0
          && votesList.votes[0].voter === voter
          && votesList.votes[0].num_changes > numChangesBefore) {
        logger.info('Found change! num_changes %s is greater than %s.',
            votesList.votes[0].num_changes, numChangesBefore);
        return true;
      }
      logger.info('Change not found! num_changes is the same.');
      return false;
    };

    // Poll to check if vote was broadcasted and saved into blockchain.
    const result = await PromiseTools.promiseInterval(
        checkVoteSaved, 1000, 30,
        pollingErrorMessage
      );
    logger.info('Result of checkVoteSaved in interval: %s', result);

    // We need to wait some time, because other API endpoints are slower
    // in reflecting current vote in their responses. We could do
    // similar checks as in `checkVoteSaved()`, but this would be
    // overkill, I think.
    const waitingPeriod = 1000 * 5;
    logger.info(
      'Waiting %sms before invalidating queries to update view',
      waitingPeriod
    );
    await PromiseTools.promiseTimeout(waitingPeriod);
  } catch (error) {
    if (typeof error === 'string' && error === pollingErrorMessage) {
      // Error in polling for broadcast result.
      const title =
        t('cards.post_card.vote_polling_error_message_title');
      const description =
        t('cards.post_card.vote_polling_error_message_description');
      transactionServiceThrowingError.handleError(
        error,
        {
          title,
          description,
          variant: 'default',
        }
      );
    } else {
      transactionServiceThrowingError.handleError(error);
    }
  }
  return { voter, author, permlink, weight };
};

export function usePostUpdateVoteMutation() {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const { signerOptions } = useSigner();
  const postUpdateVoteMutation = useMutation({
    mutationFn: (params: {
          voter: string,
          author: string,
          permlink: string,
          weight: number
        }) => {
      const { voter, author, permlink, weight } = params;
      transactionServiceThrowingError.setSignerOptions(signerOptions);
      return vote(
        transactionServiceThrowingError, voter, author, permlink,
        weight, t
      );
    },
    onSuccess: (data) => {
      console.log('usePostUpdateVoteMutation onSuccess data: %o', data);
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
              {clickedVoteButton === 'up' && postUpdateVoteMutation.isLoading ?
                <CircleSpinner loading={clickedVoteButton === 'up' && postUpdateVoteMutation.isLoading}
                              size={18} color="#dc2626" />
              :
                user && user.isLoggedIn ?
                  <Icons.arrowUpCircle
                    className={clsx(
                      'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
                      // { 'bg-red-600 text-white': checkVote && checkVote?.rshares > 0 },
                      { 'bg-red-600 text-white': userVote && userVote.vote_percent > 0 },
                    )}
                    onClick={(e) => {
                      if (postUpdateVoteMutation.isLoading) return;
                      setClickedVoteButton('up');
                      submitVote(10000);
                    }}
                  />
                :
                  <DialogLogin>
                    <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                  </DialogLogin>
              }
            </TooltipTrigger>
            <TooltipContent data-testid="upvote-button-tooltip">{t('cards.post_card.upvote')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="downvote-button" disabled={postUpdateVoteMutation.isLoading}>
            {clickedVoteButton === 'down' && postUpdateVoteMutation.isLoading ?
                <CircleSpinner loading={clickedVoteButton === 'down' && postUpdateVoteMutation.isLoading}
                              size={18} color="#dc2626" />
            :
              user && user.isLoggedIn ?
                <Icons.arrowDownCircle
                  className={clsx(
                    'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
                    // { 'bg-gray-600 text-white': checkVote && checkVote?.rshares < 0 },
                    { 'bg-gray-600 text-white': userVote && userVote.vote_percent < 0 },
                  )}
                  onClick={(e) => {
                    if (postUpdateVoteMutation.isLoading) return;
                    setClickedVoteButton('down');
                    submitVote(-10000);
                  }}
                />
              :
                <DialogLogin>
                  <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                </DialogLogin>
            }
          </TooltipTrigger>
          <TooltipContent data-testid="downvote-button-tooltip">
            {t('cards.post_card.downvote')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {userVote && userVote.vote_percent > 0 && <span>
        {t('cards.post_card.you_upvoted', { votePercent: (userVote.vote_percent / 100).toFixed(2) })}
      </span>}
      {userVote && userVote.vote_percent < 0 && <span>
        {t('cards.post_card.you_downvoted', { votePercent: (userVote.vote_percent / 100).toFixed(2) })}
      </span>}
      {userVote && userVote.vote_percent === 0 && <span>
        {t('cards.post_card.you_voted', { votePercent: (userVote.vote_percent / 100).toFixed(2) })}
      </span>}

    </div>
  );
};

export default VotesComponent;
