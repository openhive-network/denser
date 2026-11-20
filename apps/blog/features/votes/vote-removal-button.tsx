import type { ComponentPropsWithRef } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { useVoteSliderEnabled } from './hooks/use-vote-slider-enabled';
import VoteDialogButton from './vote-dialog-button';
import { useLocale } from '@ui/components/locale-context';
import { formatNumber } from '@ui/lib/locale-format';

const FULL_VOTE_PERCENT = 10000;

type VoteRemovalButtonProps = ComponentPropsWithRef<'button'> & {
  voteType: 'upvote' | 'downvote';
  /** The viewer's vote, in hundredths of a percent, negative for a downvote. */
  votePercent: number;
};

/**
 * Arrow of a vote the viewer has cast, the trigger of its removal dialog. It names the vote's
 * weight unless it is a full vote by a voter who cannot pick a weight. Reads that itself, so the
 * voter's account loading re-renders this button only.
 */
const VoteRemovalButton = ({ voteType, votePercent, ...props }: VoteRemovalButtonProps) => {
  const { t } = useTranslation('common_blog');
  const { locale } = useLocale();
  const sliderEnabled = useVoteSliderEnabled();
  const percent = Math.abs(votePercent);
  const isNamedWithoutWeight = percent === FULL_VOTE_PERCENT && !sliderEnabled;
  const weight = { votePercent: formatNumber(percent / 100, locale, 2) };
  let label: string;
  if (voteType === 'upvote') {
    label = isNamedWithoutWeight
      ? t('cards.post_card.undo_upvote')
      : t('cards.post_card.undo_upvote_percent', weight);
  } else {
    label = isNamedWithoutWeight
      ? t('cards.post_card.undo_downvote')
      : t('cards.post_card.undo_downvote_percent', weight);
  }

  return <VoteDialogButton label={label} dataTestId={`${voteType}-button`} afterPayout={false} {...props} />;
};

export default VoteRemovalButton;
