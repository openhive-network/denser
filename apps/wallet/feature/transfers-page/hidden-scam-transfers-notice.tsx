import { TFunction } from 'i18next';
import { Button } from '@ui/components';

interface HiddenScamTransfersNoticeProps {
  count: number;
  onShow: () => void;
  t: TFunction<'common_wallet', undefined>;
}

const HiddenScamTransfersNotice = ({ count, onShow, t }: HiddenScamTransfersNoticeProps) => (
  <div
    className="flex items-center gap-2 px-4 py-2 text-xs text-primary/70 sm:text-sm"
    data-testid="wallet-account-history-scam-hidden"
  >
    <span>{t('profile.scam_transfers_hidden', { count })}</span>
    <Button variant="link" className="h-auto p-0" onClick={onShow} data-testid="wallet-account-history-scam-show">
      {t('profile.scam_transfers_show')}
    </Button>
  </div>
);

export default HiddenScamTransfersNotice;
