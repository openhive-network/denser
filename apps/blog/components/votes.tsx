import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import type { Entry } from '@transaction/lib/bridge';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useVoteMutation } from '../components/hooks/use-vote-mutation';
import { useQuery } from '@tanstack/react-query';
import { CircleSpinner } from 'react-spinners-kit';
import { getListVotesByCommentVoter } from '@transaction/lib/hive';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

const VotesComponent = ({ post }: { post: Entry }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  const [clickedVoteButton, setClickedVoteButton] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);
  const checkVote = isClient && post.active_votes.find((e) => e.voter === user?.username);

  const { data: userVotes } = useQuery(
    ['votes', post.author, post.permlink, user?.username],
    () => getListVotesByCommentVoter([post.author, post.permlink, user?.username], 1),
    {
      enabled: !!checkVote || !!clickedVoteButton
    }
  );

  const userVote =
    userVotes?.votes[0] && userVotes?.votes[0].voter === user.username ? userVotes.votes[0] : undefined;

  const voteMutation = useVoteMutation();

  const submitVote = async (weight: number) => {
    const { author, permlink } = post;
    const voter = user.username;
    try {
      await voteMutation.mutateAsync({ voter, author, permlink, weight });
    } catch (error) {
      handleError(error, { method: 'vote', params: { voter, author, permlink, weight } });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="upvote-button" disabled={voteMutation.isLoading}>
            {clickedVoteButton === 'up' && voteMutation.isLoading ? (
              <CircleSpinner
                loading={clickedVoteButton === 'up' && voteMutation.isLoading}
                size={18}
                color="#dc2626"
              />
            ) : user && user.isLoggedIn ? (
              <Icons.arrowUpCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
                  { 'bg-red-600 text-white': userVote && userVote.vote_percent > 0 }
                )}
                onClick={(e) => {
                  if (voteMutation.isLoading) return;
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
            ) : (
              <DialogLogin>
                <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
              </DialogLogin>
            )}
          </TooltipTrigger>
          <TooltipContent data-testid="upvote-button-tooltip">
            {userVote && userVote.vote_percent > 0
              ? userVote.vote_percent === 10000
                ? t('cards.post_card.undo_upvote')
                : t('cards.post_card.undo_upvote_percent', {
                    votePercent: (userVote.vote_percent / 100).toFixed(2)
                  })
              : t('cards.post_card.upvote')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger data-testid="downvote-button" disabled={voteMutation.isLoading}>
            {clickedVoteButton === 'down' && voteMutation.isLoading ? (
              <CircleSpinner
                loading={clickedVoteButton === 'down' && voteMutation.isLoading}
                size={18}
                color="#dc2626"
              />
            ) : user && user.isLoggedIn ? (
              <Icons.arrowDownCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
                  { 'bg-gray-600 text-white': userVote && userVote.vote_percent < 0 }
                )}
                onClick={(e) => {
                  if (voteMutation.isLoading) return;
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
            ) : (
              <DialogLogin>
                <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
              </DialogLogin>
            )}
          </TooltipTrigger>
          <TooltipContent data-testid="downvote-button-tooltip">
            {userVote && userVote.vote_percent < 0
              ? userVote.vote_percent === -10000
                ? t('cards.post_card.undo_downvote')
                : t('cards.post_card.undo_downvote_percent', {
                    votePercent: (-userVote.vote_percent / 100).toFixed(2)
                  })
              : t('cards.post_card.downvote')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default VotesComponent;
