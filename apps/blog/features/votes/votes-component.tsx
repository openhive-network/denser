import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import clsx from 'clsx';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { Slider } from '@ui/components/slider';
import { Icons } from '@ui/components/icons';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DialogLogin from '@/blog/components/dialog-login';
import { useQuery } from '@tanstack/react-query';
import { getListVotesByCommentVoter } from '@transaction/lib/hive-api';
import type { TrimmedEntry } from '@/blog/features/list-of-posts/lib/card-entry';
import { Popover, PopoverTrigger, PopoverContent } from '@ui/components/popover';
import { useLoggedUserNetVests } from '@/blog/features/votes/hooks/use-logged-user';
import { useTranslation } from '@/blog/i18n/client';
import { handleError } from '@ui/lib/handle-error';
import { useVoteMutation } from './hooks/use-vote-mutation';
import { VoteRemovalDialog } from './vote-removal-dialog';

const VOTE_WEIGHT_DROPDOWN_THRESHOLD = 1.0 * 1000.0 * 1000.0;

const offsetSlider = {
  popoverSideOffset: -37,
  popoverAlignOfset: -19
};

// Default votes values - defined outside component for stable reference
const DEFAULT_VOTES_VALUES = {
  post: {
    upvote: [100],
    downvote: [100]
  },
  comment: {
    upvote: [100],
    downvote: [100]
  }
};

// Safe accessor for vote values - handles legacy/malformed localStorage data
const getVoteValue = (
  stored: typeof DEFAULT_VOTES_VALUES | null | undefined,
  voteType: 'post' | 'comment',
  direction: 'upvote' | 'downvote'
): number[] => {
  return stored?.[voteType]?.[direction] ?? DEFAULT_VOTES_VALUES[voteType][direction];
};

const VotesComponent = ({ post, type }: { post: TrimmedEntry; type: 'comment' | 'post' }) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const [clickedVoteButton, setClickedVoteButton] = useState('');
  // The slider popover mounts when it opens: until then every vote button on the page is a
  // plain button, and the reader's account arriving (which enables the slider) remounts none.
  const [openSlider, setOpenSlider] = useState<'up' | 'down' | null>(null);
  const [storedVotesValues, storeVotesValues] = useStorageWithTTL(
    'votesValues',
    DEFAULT_VOTES_VALUES,
    StorageTTL.PERMANENT
  );
  const [sliderUpvote, setSliderUpvote] = useState(() =>
    getVoteValue(storedVotesValues, type, 'upvote')
  );
  const [sliderDownvote, setSliderDownvote] = useState(() =>
    getVoteValue(storedVotesValues, type, 'downvote')
  );
  const voter = user.username;
  const pastPayout = new Date(`${post.payout_at}Z`) < new Date();
  useEffect(() => {
    setSliderUpvote(getVoteValue(storedVotesValues, type, 'upvote'));
  }, [type, storedVotesValues]);
  useEffect(() => {
    setSliderDownvote(getVoteValue(storedVotesValues, type, 'downvote'));
  }, [type, storedVotesValues]);
  const entryVote = post.active_votes.find((e) => e.voter === voter);
  // The entry's rshares give the direction of the reader's vote, so a page of voted cards
  // asks the chain nothing on load. The chain is asked only for what rshares cannot tell:
  // a zero-rshares vote (removed, or too small to count) and, once a tooltip showing it
  // opens, the vote's percent.
  const [wantsVotePercent, setWantsVotePercent] = useState(false);
  const { data: userVotes } = useQuery({
    queryKey: ['votes', post.author, post.permlink, user?.username],
    queryFn: () => getListVotesByCommentVoter([post.author, post.permlink, user?.username], 1),
    enabled: (!!entryVote && (entryVote.rshares === 0 || wantsVotePercent)) || !!clickedVoteButton,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  });
  const net_vests = useLoggedUserNetVests();
  const enable_slider = net_vests > VOTE_WEIGHT_DROPDOWN_THRESHOLD;

  const userVote =
    userVotes?.votes[0] && userVotes?.votes[0].voter === voter ? userVotes.votes[0] : undefined;
  const voteMutation = useVoteMutation();
  const voteDirection = userVotes ? Math.sign(userVote?.vote_percent ?? 0) : Math.sign(entryVote?.rshares ?? 0);
  const vote_upvoted = voteDirection > 0;
  const vote_downvoted = voteDirection < 0;
  const votePercent = userVote ? Math.abs(userVote.vote_percent) / 100 : undefined;
  const showsFullVote = votePercent === undefined || (votePercent === 100 && !enable_slider);
  const requestVotePercent = useCallback((open: boolean) => {
    if (open) setWantsVotePercent(true);
  }, []);
  const closeSlider = useCallback((open: boolean) => {
    if (!open) setOpenSlider(null);
  }, []);

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
      setClickedVoteButton('');
      handleError(error, { method: 'vote', params: { voter, author, permlink, weight } });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Upvote with slider - trigger */}
      {clickedVoteButton === 'up' && voteMutation.isLoading ? (
        <CircleSpinner
          loading={clickedVoteButton === 'up' && voteMutation.isLoading}
          size={20}
          color="#dc2626"
        />
      ) : user.isLoggedIn && enable_slider && !vote_upvoted && openSlider === 'up' ? (
        <Popover open onOpenChange={closeSlider}>
          <PopoverTrigger className="flex h-full items-center justify-center" disabled={voteMutation.isLoading}>
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={t('cards.post_card.upvote')}
              dataTestId="upvote-button"
              afterPayout={pastPayout && !vote_upvoted}
            >
              <Icons.arrowUpCircle
                className={clsx(
                  'h-5 w-5 rounded-xl text-destructive hover:bg-destructive-icon hover:text-white',
                  { 'bg-destructive-icon text-white': vote_upvoted }
                )}
              />
            </TooltipContainer>
          </PopoverTrigger>
          <PopoverContent
            className="z-50 max-w-xs rounded-lg bg-background-secondary p-4 shadow-lg"
            sideOffset={offsetSlider.popoverSideOffset}
            align="start"
            alignOffset={offsetSlider.popoverAlignOfset}
            data-testid="upvote-slider-modal"
          >
            <div className="flex h-full items-center gap-2">
              <TooltipContainer
                loading={voteMutation.isLoading}
                text={t('cards.post_card.upvote')}
                dataTestId="upvote-button-slider"
                afterPayout={pastPayout && !vote_upvoted}
              >
                <button
                  className="flex h-full items-center justify-center"
                  disabled={voteMutation.isLoading}
                  onClick={() => {
                    setOpenSlider(null);
                    setClickedVoteButton('up');
                    submitVote(sliderUpvote[0] * 100);
                    storeVotesValues((prev) => ({
                      ...prev,
                      [type]: {
                        ...prev[type],
                        upvote: sliderUpvote
                      }
                    }));
                  }}
                >
                  <Icons.arrowUpCircle
                    className="h-[24px] w-[24px] cursor-pointer rounded-xl text-destructive hover:bg-destructive-icon hover:text-white sm:mr-1"
                  />
                </button>
              </TooltipContainer>
              <Slider
                dataTestId="upvote-slider"
                defaultValue={sliderUpvote}
                value={sliderUpvote}
                min={1}
                className="w-36"
                onValueChange={(e: number[]) => setSliderUpvote(e)}
              />
              <div className="w-fit" data-testid="upvote-slider-percentage-value">
                {sliderUpvote}%
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : user.isLoggedIn && vote_upvoted ? (
        <VoteRemovalDialog
          voteType="upvote"
          onConfirm={() => {
            setClickedVoteButton('up');
            submitVote(0);
          }}
        >
          <span>
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={
                showsFullVote
                  ? t('cards.post_card.undo_upvote')
                  : t('cards.post_card.undo_upvote_percent', { votePercent: votePercent.toFixed(2) })
              }
              onOpenChange={requestVotePercent}
              dataTestId="upvote-button"
              afterPayout={pastPayout && !vote_upvoted}
            >
              <Icons.arrowUpCircle className="h-5 w-5 cursor-pointer rounded-xl bg-destructive-icon text-white hover:bg-destructive-icon hover:text-white" />
            </TooltipContainer>
          </span>
        </VoteRemovalDialog>
      ) : user.isLoggedIn ? (
        <button
          className="flex h-full items-center justify-center"
          aria-haspopup={enable_slider ? 'dialog' : undefined}
          disabled={voteMutation.isLoading}
          onClick={() => {
            if (voteMutation.isLoading) return;
            if (enable_slider) {
              setOpenSlider('up');
              return;
            }
            setClickedVoteButton('up');
            submitVote(10000);
          }}
        >
          <TooltipContainer
            loading={voteMutation.isLoading}
            text={t('cards.post_card.upvote')}
            dataTestId="upvote-button"
            afterPayout={pastPayout && !vote_upvoted}
          >
            <Icons.arrowUpCircle className="h-5 w-5 rounded-xl text-destructive hover:bg-destructive-icon hover:text-white" />
          </TooltipContainer>
        </button>
      ) : (
        <DialogLogin>
          <div className="flex items-center">
            <TooltipContainer
              text={t('cards.post_card.upvote')}
              loading={voteMutation.isLoading}
              dataTestId="upvote-button"
              afterPayout={pastPayout && !vote_upvoted}
            >
              <Icons.arrowUpCircle className="h-5 w-5 rounded-xl text-destructive hover:bg-destructive-icon hover:text-white" />
            </TooltipContainer>
          </div>
        </DialogLogin>
      )}
      {/* Downvote with slider - trigger */}
      {clickedVoteButton === 'down' && voteMutation.isLoading ? (
        <CircleSpinner
          loading={clickedVoteButton === 'down' && voteMutation.isLoading}
          size={20}
          color="#dc2626"
        />
      ) : user.isLoggedIn && enable_slider && !vote_downvoted && openSlider === 'down' ? (
        <Popover open onOpenChange={closeSlider}>
          <PopoverTrigger className="flex h-full items-center justify-center" disabled={voteMutation.isLoading}>
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={t('cards.post_card.downvote')}
              dataTestId="downvote-button"
              afterPayout={pastPayout && !vote_downvoted}
            >
              <Icons.arrowDownCircle
                className={clsx(
                  'h-5 w-5 rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white',
                  { 'bg-gray-600 text-white': vote_downvoted }
                )}
              />
            </TooltipContainer>
          </PopoverTrigger>
          <PopoverContent
            className="z-50 max-w-xs rounded-lg bg-background-secondary p-4 shadow-lg"
            sideOffset={offsetSlider.popoverSideOffset}
            align="start"
            alignOffset={offsetSlider.popoverAlignOfset}
            data-testid="downvote-slider-modal"
          >
            <div className="flex h-full items-center gap-2">
              <TooltipContainer
                loading={voteMutation.isLoading}
                text={t('cards.post_card.downvote')}
                dataTestId="downvote-button-slider"
                afterPayout={pastPayout && !vote_downvoted}
              >
                <button
                  className="flex h-full items-center justify-center"
                  disabled={voteMutation.isLoading}
                  onClick={() => {
                    setOpenSlider(null);
                    setClickedVoteButton('down');
                    submitVote(-sliderDownvote[0] * 100);
                    storeVotesValues((prev) => ({
                      ...prev,
                      [type]: {
                        ...prev[type],
                        downvote: sliderDownvote
                      }
                    }));
                  }}
                >
                  <Icons.arrowDownCircle
                    className="h-[24px] w-[24px] cursor-pointer rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1"
                  />
                </button>
              </TooltipContainer>
              <Slider
                dataTestId="downvote-slider"
                defaultValue={sliderDownvote}
                value={sliderDownvote}
                min={1}
                className="w-36"
                onValueChange={(e: number[]) => setSliderDownvote(e)}
              />
              <div className="w-fit text-destructive" data-testid="downvote-slider-percentage-value">
                -{sliderDownvote}%
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-2 text-sm" data-testid="downvote-description-content">
              <p>{t('cards.post_card.downvote_warning')}</p>
              <ul>
                <li>{t('cards.post_card.reason_1')}</li>
                <li>{t('cards.post_card.reason_2')}</li>
                <li>{t('cards.post_card.reason_3')}</li>
                <li>{t('cards.post_card.reason_4')}</li>
              </ul>
            </div>
          </PopoverContent>
        </Popover>
      ) : user.isLoggedIn && vote_downvoted ? (
        <VoteRemovalDialog
          voteType="downvote"
          onConfirm={() => {
            setClickedVoteButton('down');
            submitVote(0);
          }}
        >
          <span>
            <TooltipContainer
              loading={voteMutation.isLoading}
              text={
                showsFullVote
                  ? t('cards.post_card.undo_downvote')
                  : t('cards.post_card.undo_downvote_percent', { votePercent: votePercent.toFixed(2) })
              }
              onOpenChange={requestVotePercent}
              dataTestId="downvote-button"
              afterPayout={pastPayout && !vote_downvoted}
            >
              <Icons.arrowDownCircle className="h-5 w-5 cursor-pointer rounded-xl bg-destructive-icon text-white opacity-80 hover:bg-gray-600 hover:text-white" />
            </TooltipContainer>
          </span>
        </VoteRemovalDialog>
      ) : user.isLoggedIn ? (
        <button
          className="flex h-full items-center justify-center"
          aria-haspopup={enable_slider ? 'dialog' : undefined}
          disabled={voteMutation.isLoading}
          onClick={() => {
            if (voteMutation.isLoading) return;
            if (enable_slider) {
              setOpenSlider('down');
              return;
            }
            setClickedVoteButton('down');
            submitVote(-10000);
          }}
        >
          <TooltipContainer
            loading={voteMutation.isLoading}
            text={t('cards.post_card.downvote')}
            dataTestId="downvote-button"
            afterPayout={pastPayout && !vote_downvoted}
          >
            <Icons.arrowDownCircle className="h-5 w-5 rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white" />
          </TooltipContainer>
        </button>
      ) : (
        <DialogLogin>
          <div className="flex items-center">
            <TooltipContainer
              text={t('cards.post_card.downvote')}
              loading={voteMutation.isLoading}
              dataTestId="downvote-button"
              afterPayout={pastPayout && !vote_downvoted}
            >
              <Icons.arrowDownCircle className="h-5 w-5 rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white" />
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
  dataTestId,
  afterPayout,
  onOpenChange
}: {
  children: ReactNode;
  loading: boolean;
  text: string;
  dataTestId: string;
  afterPayout?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  return (
    <TooltipProvider>
      <Tooltip onOpenChange={onOpenChange}>
        <TooltipTrigger data-testid={dataTestId} disabled={loading} asChild>
          <span className="cursor-pointer">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          data-testid={dataTestId + '-tooltip'}
          className="flex flex-col items-center justify-center"
        >
          <div className="font-bold">{text}</div>
          {afterPayout && (
            <div className="text-xs text-destructive opacity-80">
              Voting on Content after their payout does not generate any new rewards
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
