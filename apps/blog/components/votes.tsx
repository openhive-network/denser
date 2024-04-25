import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import type { Entry } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { transactionService, TransactionServiceThrowingError, TransactionErrorHandlingMode } from '@transaction/index';
import env from '@beam-australia/react-env';
import { PromiseTools } from '@transaction/lib/promise-tools'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CircleSpinner } from 'react-spinners-kit';
import { useSigner } from '@smart-signer/lib/use-signer';
import { IVoteListItem, getListVotesByCommentVoter } from '@transaction/lib/hive';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const transactionServiceThrowingError =
  new TransactionServiceThrowingError(
    TransactionErrorHandlingMode.OnlyThrow
  );

const vote = async (service: TransactionServiceThrowingError, voter: string, author: string, permlink: string, weight: number) => {
  try {

    if (weight > 0) {
      weight = 1;
    } else {
      weight = -1;
    }

    // Get the newest num_changes for the vote.
    let numChangesBefore = -1; // -1 means vote does not exist
    const votesListBefore = await getListVotesByCommentVoter([author, permlink, voter], 1);
    if (votesListBefore && votesListBefore.votes.length > 0 && votesListBefore.votes[0].voter === voter) {
      numChangesBefore = votesListBefore.votes[0].num_changes;
    }
    // Vote now
    await service.upVote(author, permlink, weight);
    logger.info('Voted: %o', { voter, author, permlink, weight, numChangesBefore });

    // Check if num_changes is greater than before.
    let counter = 0;
    const checkVoteSaved = async () => {
      const votesList = await getListVotesByCommentVoter([author, permlink, voter], 1);
      logger.info('try #%s votesList: %o', ++counter, votesList);
      if (votesList && votesList.votes.length > 0
          && votesList.votes[0].voter === voter
          && votesList.votes[0].num_changes > numChangesBefore) {
        logger.info('num_changes %s is greater than %s', votesList.votes[0].num_changes, numChangesBefore);
        return true;
      }
      logger.info('num_changes is the same');
      return false;
    };

    // Poll to check if vote was broadcasted and saved in blockchain.
    const result = await PromiseTools.promiseInterval(checkVoteSaved, 1000, 20);
    logger.info('result of checkVoteSaved in interval: %s', result);

    const waitingPeriod = 1000 * 5;
    logger.info('Waiting for %sms before updating view', waitingPeriod);
    await PromiseTools.promiseTimeout(waitingPeriod);

  } catch (error) {
    if (error === 'Failure') {
      // Error from PromiseTools.promiseInterval
    } else {
      transactionServiceThrowingError.handleError(error);
    }
  }
  return { voter, author, permlink, weight };
};

export function usePostUpdateVoteMutation() {
  const queryClient = useQueryClient();
  const { signerOptions } = useSigner();
  const postUpdateVoteMutation = useMutation({
    mutationFn: (params: { voter: string, author: string, permlink: string, weight: number }) => {
      const { voter, author, permlink, weight } = params;
      transactionServiceThrowingError.setSignerOptions(signerOptions);
      return vote(
        transactionServiceThrowingError, voter, author, permlink, weight
      );
    },
    onSuccess: (data) => {
      console.log('usePostUpdateVoteMutation onSuccess data: %o', data);
      queryClient.invalidateQueries({ queryKey: ['votes', data.author, data.permlink, data.voter] });
      queryClient.invalidateQueries({ queryKey: [data.permlink, data.voter, 'ActiveVotes'] });
      queryClient.invalidateQueries({ queryKey: ['postData', data.author, data.permlink ] });
      queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });

    },
    onError: (error) => {
      throw error;
    }
  });
  return postUpdateVoteMutation;
};


const VotesComponent = ({ post }: { post: Entry }) => {
  const walletHost = env('WALLET_ENDPOINT');
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  const [clickedVoteButton, setClickedVoteButton] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);
  const checkVote = isClient && post.active_votes.find((e) => e.voter === user?.username);

  const {
    isLoading: isLoadingUserVotes,
    error: errorUserVotes,
    data: userVotes
  } = useQuery(
    ['votes', post.author, post.permlink, user?.username],
    () => getListVotesByCommentVoter(
      [post.author, post.permlink, user?.username], 1),
    {
      enabled: !!checkVote || !!clickedVoteButton
    }
  );

  // let userVote: IVoteListItem;
  // if (userVotes) {
  //   userVote = userVotes.votes[0];
  //   // logger.info('user: %s voted: %s for post.author: %s, post.permlink: %s. Full userVote is: %o',
  //   //   user.username, userVote.vote_percent, post.author, post.permlink, userVote);
  // }

  const userVote = userVotes?.votes[0]
      && userVotes?.votes[0].voter === user.username
    ? userVotes.votes[0]
    : undefined;

  const postUpdateVoteMutation = usePostUpdateVoteMutation();

  const submitVote = async (weight: number) => {
    const { author, permlink } = post;
    const voter = user.username;
    try {
      await postUpdateVoteMutation.mutateAsync({ voter, author, permlink, weight });
    } catch (error) {
      // TODO We'll never get error here – it's handled in TransactionService.
      // do nothing
    }
  }

  // logger.info({ post, user, checkVote });

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

      {/* {checkVote && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{checkVote?.rshares === 0 && 'Voted'}</TooltipTrigger>
            <TooltipContent className="flex flex-col">
              <span>You voted but your Hive Power is too low to check if you upvote or downvote.</span>
              <span>
                Boost your Hive Power in
                <Link
                  className="font-bold hover:text-red-600"
                  target="_blank"
                  href={`${walletHost}/${user?.username}/transfers`}
                >
                  {' Wallet '}
                </Link>
                to see more
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )} */}

    {userVote && userVote.vote_percent > 0 && <span>You upvoted {String(userVote.vote_percent / 100)}%</span>}
    {userVote && userVote.vote_percent < 0 && <span>You downvoted {String(userVote.vote_percent / 100)}%</span>}

    </div>
  );
};
export default VotesComponent;
