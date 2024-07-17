import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Icons } from '@ui/components/icons';
import DialogLogin from './dialog-login';
import clsx from 'clsx';
import { useTranslation } from 'next-i18next';
import { ReactNode, useEffect, useState } from 'react';
import { useVoteMutation } from '../components/hooks/use-vote-mutation';
import { useQuery } from '@tanstack/react-query';
import { CircleSpinner } from 'react-spinners-kit';
import { getListVotesByCommentVoter } from '@transaction/lib/hive';
import { getLogger } from '@ui/lib/logging';
import { Entry } from '@transaction/lib/bridge';
import { DropdownMenuContent, DropdownMenuTrigger, DropdownMenu } from '@ui/components';
import { Slider } from '@ui/components/slider';
import { useLoggedUserContext } from './common/logged-user';
import { handleError } from '@ui/lib/utils';
import { useStore } from './hooks/use-store';
const logger = getLogger('app');

const VOTE_WEIGHT_DROPDOWN_THRESHOLD = 1.0 * 1000.0 * 1000.0;

const VotesComponent = ({ post }: { post: Entry }) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [isClient, setIsClient] = useState(false);
  const [clickedVoteButton, setClickedVoteButton] = useState('');
  const { upvote, downvote, changeUpvote, changeDownvote } = useStore();
  const [sliderUpvote, setSliderUpvote] = useState(upvote);
  const [sliderDownvote, setSliderDownvote] = useState(downvote);
  const voter = user.username;
  useEffect(() => {
    setSliderUpvote(upvote);
  }, [upvote]);
  useEffect(() => {
    setSliderDownvote(downvote);
  }, [downvote]);
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
  const { net_vests } = useLoggedUserContext();
  const enable_slider = net_vests > VOTE_WEIGHT_DROPDOWN_THRESHOLD;

  const userVote =
    userVotes?.votes[0] && userVotes?.votes[0].voter === user.username ? userVotes.votes[0] : undefined;
  const voteMutation = useVoteMutation();
  const vote_upvoted = userVote ? userVote.vote_percent > 0 : false;
  const vote_downvoted = userVote ? userVote.vote_percent < 0 : false;

  useEffect(() => {
    if (userVote && userVote.vote_percent > 0) {
      setSliderUpvote([userVote.vote_percent / 100]);
    }
    if (userVote && userVote.vote_percent < 0) {
      setSliderDownvote([-userVote.vote_percent / 100]);
    }
  }, [userVotes]);
  const submitVote = async (weight: number) => {
    const { author, permlink } = post;
    try {
      await voteMutation.mutateAsync({ voter, author, permlink, weight });
    } catch (error) {
      handleError(error, { method: 'vote', params: { voter, author, permlink, weight } });
    }
  };

  return (
    <div className="flex items-center gap-1">
      {clickedVoteButton === 'up' && voteMutation.isLoading ? (
        <CircleSpinner
          loading={clickedVoteButton === 'up' && voteMutation.isLoading}
          size={18}
          color="#dc2626"
        />
      ) : user.isLoggedIn && enable_slider && !vote_upvoted ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center">
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={t('cards.post_card.upvote')}
              dataTestId="upvote-button"
            >
              <Icons.arrowUpCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
                  { 'bg-red-600 text-white': userVote && userVote.vote_percent > 0 }
                )}
              />
            </TooltipContainer>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="h-16 w-64 p-2">
            <div className="flex h-full items-center gap-2">
              <TooltipContainer
                loading={voteMutation.isLoading}
                text={t('cards.post_card.upvote')}
                dataTestId="upvote-button"
              >
                <Icons.arrowUpCircle
                  className="h-[24px] w-[24px] cursor-pointer rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1"
                  onClick={() => {
                    if (voteMutation.isLoading) return;
                    setClickedVoteButton('up');
                    submitVote(sliderUpvote[0] * 100);
                    changeUpvote(sliderUpvote);
                  }}
                />
              </TooltipContainer>
              <Slider
                defaultValue={sliderUpvote}
                value={sliderUpvote}
                min={1}
                className="w-36"
                onValueChange={(e: number[]) => setSliderUpvote(e)}
              />
              <div className="w-fit">{sliderUpvote}%</div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : user.isLoggedIn ? (
        <TooltipContainer
          loading={voteMutation.isLoading}
          text={
            userVote && userVote.vote_percent > 0
              ? userVote.vote_percent === 10000 && !enable_slider
                ? t('cards.post_card.undo_upvote')
                : t('cards.post_card.undo_upvote_percent', {
                    votePercent: (userVote.vote_percent / 100).toFixed(2)
                  })
              : t('cards.post_card.upvote')
          }
          dataTestId="upvote-button"
        >
          <Icons.arrowUpCircle
            className={clsx(
              'h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1',
              { 'bg-red-600 text-white': userVote && userVote.vote_percent > 0 }
            )}
            onClick={() => {
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
        </TooltipContainer>
      ) : (
        <DialogLogin>
          <div className="flex items-center">
            <TooltipContainer
              text={t('cards.post_card.upvote')}
              loading={voteMutation.isLoading}
              dataTestId="upvote-button"
            >
              <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
            </TooltipContainer>
          </div>
        </DialogLogin>
      )}
      {clickedVoteButton === 'down' && voteMutation.isLoading ? (
        <CircleSpinner
          loading={clickedVoteButton === 'down' && voteMutation.isLoading}
          size={18}
          color="#dc2626"
        />
      ) : user.isLoggedIn && enable_slider && !vote_downvoted ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center">
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={t('cards.post_card.downvote')}
              dataTestId="downvote-button"
            >
              <Icons.arrowDownCircle
                className={clsx(
                  'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
                  { 'bg-gray-600 text-white': userVote && userVote.vote_percent < 0 }
                )}
              />
            </TooltipContainer>
          </DropdownMenuTrigger>
          <DropdownMenuContent className=" w-64 p-2">
            <div className="flex h-full items-center gap-2">
              <TooltipContainer
                loading={voteMutation.isLoading}
                text={t('cards.post_card.downvote')}
                dataTestId="downvote-button"
              >
                <Icons.arrowDownCircle
                  className="h-[24px] w-[24px] cursor-pointer rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1"
                  onClick={() => {
                    if (voteMutation.isLoading) return;
                    setClickedVoteButton('down');
                    submitVote(-sliderDownvote[0] * 100);
                    changeDownvote(sliderDownvote);
                  }}
                />
              </TooltipContainer>
              <Slider
                defaultValue={sliderDownvote}
                value={sliderDownvote}
                min={1}
                className="w-36"
                onValueChange={(e: number[]) => setSliderDownvote(e)}
              />
              <div className="w-fit text-red-600">-{sliderDownvote}%</div>
            </div>
            <div className="flex flex-col gap-1 pt-2 text-sm">
              <p>{t('cards.post_card.downvote_warning')}</p>
              <ul>
                <li>{t('cards.post_card.reason_1')}</li>
                <li>{t('cards.post_card.reason_2')}</li>
                <li>{t('cards.post_card.reason_3')}</li>
                <li>{t('cards.post_card.reason_4')}</li>
              </ul>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : user.isLoggedIn ? (
        <TooltipContainer
          loading={voteMutation.isLoading}
          text={
            userVote && userVote.vote_percent < 0
              ? userVote.vote_percent === -10000 && !enable_slider
                ? t('cards.post_card.undo_downvote')
                : t('cards.post_card.undo_downvote_percent', {
                    votePercent: (-userVote.vote_percent / 100).toFixed(2)
                  })
              : t('cards.post_card.downvote')
          }
          dataTestId="downvote-button"
        >
          <Icons.arrowDownCircle
            className={clsx(
              'h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1',
              { 'bg-gray-600 text-white': userVote && userVote.vote_percent < 0 }
            )}
            onClick={() => {
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
        </TooltipContainer>
      ) : (
        <DialogLogin>
          <div className="flex items-center">
            <TooltipContainer
              text={t('cards.post_card.downvote')}
              loading={voteMutation.isLoading}
              dataTestId="downvote-button"
            >
              <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
            </TooltipContainer>
          </div>
        </DialogLogin>
      )}
    </div>
  );
};

export default VotesComponent;

const TooltipContainer = ({
  children,
  loading,
  text,
  dataTestId
}: {
  children: ReactNode;
  loading: boolean;
  text: string;
  dataTestId: string;
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger data-testid={dataTestId} disabled={loading} asChild>
          <span className="cursor-pointer">{children}</span>
        </TooltipTrigger>
        <TooltipContent data-testid={dataTestId + '-tooltip'}>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
