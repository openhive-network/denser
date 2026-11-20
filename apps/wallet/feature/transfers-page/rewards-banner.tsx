'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import { NaiAsset } from '@hiveio/wax';
import { Button } from '@ui/components';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { convertStringToBig } from '@ui/lib/helpers';
import { formatAsset } from '@ui/lib/asset-format';
import { useLocale } from '@ui/components/locale-context';
import { formatList } from '@ui/lib/locale-format';
import { getFindAccounts } from '@transaction/lib/hive-api';
import { useClaimRewardsMutation } from '@/wallet/components/hooks/use-claim-rewards-mutation';
import { handleError } from '@ui/lib/handle-error';

interface RewardBalances {
  reward_hive_balance: NaiAsset;
  reward_hbd_balance: NaiAsset;
  reward_vesting_hive: NaiAsset;
}

interface RewardsBannerProps {
  username: string;
  isOwner: boolean;
  rewardBalances: RewardBalances;
}

const RewardsBanner = ({ username, isOwner, rewardBalances }: RewardsBannerProps) => {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const claimRewardsMutation = useClaimRewardsMutation();

  const rewardsStr = useMemo(() => {
    const isPositive = (asset: NaiAsset | undefined): asset is NaiAsset =>
      asset !== undefined && convertStringToBig(asset).gt(0);
    const { reward_hive_balance: hive, reward_hbd_balance: hbd, reward_vesting_hive: hp } = rewardBalances;
    const allRewards = [
      isPositive(hive) ? formatAsset(hive, { locale }) : null,
      isPositive(hbd) ? formatAsset(hbd, { locale }) : null,
      isPositive(hp) ? `${formatAsset(hp, { appendTokenName: false, locale })} HP` : null
    ].filter((reward): reward is string => reward !== null);
    return allRewards.length ? formatList(allRewards, locale) : '';
  }, [rewardBalances, locale]);

  const claimRewards = async () => {
    try {
      const accounts = await getFindAccounts(username);
      await claimRewardsMutation.mutateAsync({ account: accounts.accounts[0] });
    } catch (error) {
      handleError(error, { method: 'claim_reward_balance', params: { account: username } });
    }
  };

  if (!rewardsStr.length) return null;

  return (
    <div className="mx-auto w-full px-2 text-sm md:px-0 md:text-base">
      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col items-center justify-between gap-y-2 rounded-md bg-slate-600 px-4 py-4 text-white md:flex-row">
        <div className="w-full text-center md:text-left">
          {t('transfers_page.current_rewards', { rewards: rewardsStr })}
        </div>
        {isOwner && (
          <Button
            className="h-fit shrink-0 text-sm md:text-base"
            variant="redHover"
            onClick={() => claimRewards()}
            disabled={claimRewardsMutation.isPending}
          >
            {t('transfers_page.redeem_rewards')}
            {claimRewardsMutation.isPending ? <CircleSpinner size={18} color="#dc2626" /> : null}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RewardsBanner;
