import { TFunction } from 'i18next';
import { Button } from '@ui/components';

interface HiddenTransfersNoticeProps {
  badActorCount: number;
  mutedCount: number;
  onShow: () => void;
  t: TFunction<'common_wallet', undefined>;
}

const hiddenTransfersMessage = (
  badActorCount: number,
  mutedCount: number,
  t: TFunction<'common_wallet', undefined>
): string => {
  if (mutedCount === 0) return t('profile.hidden_transfers_bad_actors', { count: badActorCount });
  if (badActorCount === 0) return t('profile.hidden_transfers_muted', { count: mutedCount });
  return t('profile.hidden_transfers_both', {
    count: badActorCount + mutedCount,
    badActorCount,
    mutedCount
  });
};

const HiddenTransfersNotice = ({ badActorCount, mutedCount, onShow, t }: HiddenTransfersNoticeProps) => (
  <div
    className="flex items-center gap-2 px-4 py-2 text-xs text-primary/70 sm:text-sm"
    data-testid="wallet-account-history-scam-hidden"
  >
    <span data-testid="wallet-account-history-scam-hidden-text">
      {hiddenTransfersMessage(badActorCount, mutedCount, t)}
    </span>
    <Button variant="link" className="h-auto p-0" onClick={onShow} data-testid="wallet-account-history-scam-show">
      {t('profile.scam_transfers_show')}
    </Button>
  </div>
);

export default HiddenTransfersNotice;
