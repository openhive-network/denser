'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import { NaiAsset } from '@hiveio/wax';
import { Button } from '@ui/components';
import { CircleSpinner } from 'react-spinners-kit';
import { convertStringToBig, formatNaiAsset } from '@ui/lib/helpers';
import { getFindAccounts } from '@transaction/lib/hive-api';
import { useClaimRewardsMutation } from '@/wallet/components/hooks/use-claim-rewards-mutation';
import { handleError } from '@ui/lib/handle-error';
import { toast } from '@ui/components/hooks/use-toast';

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
  const claimRewardsMutation = useClaimRewardsMutation();

  const rewardsStr = useMemo(() => {
    const allRewards = [
      rewardBalances.reward_hive_balance && convertStringToBig(rewardBalances.reward_hive_balance).gt(0)
        ? formatNaiAsset(rewardBalances.reward_hive_balance, 'HIVE')
        : null,
      rewardBalances.reward_hbd_balance && convertStringToBig(rewardBalances.reward_hbd_balance).gt(0)
        ? formatNaiAsset(rewardBalances.reward_hbd_balance, 'HBD')
        : null,
      rewardBalances.reward_vesting_hive && convertStringToBig(rewardBalances.reward_vesting_hive).gt(0)
        ? formatNaiAsset(rewardBalances.reward_vesting_hive, 'HP')
        : null
    ].filter(Boolean);

    return allRewards.length > 2
      ? `${allRewards[0]}, ${allRewards[1]} ${t('global.and')} ${allRewards[2]}`
      : allRewards.join(` ${t('global.and')} `);
  }, [rewardBalances, t]);

  const claimRewards = async () => {
    const accounts = await getFindAccounts(username);
    const params = { account: accounts.accounts[0] };
    try {
      await claimRewardsMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'claim_reward_balance', params });
    } finally {
      toast({
        title: t('transfers_page.transaction_success'),
        description: t('transfers_page.redeem_rewards'),
        variant: 'success'
      });
    }
  };

  if (!rewardsStr.length) return null;

  return (
    <div className="mx-auto w-full px-2 text-sm md:px-0 md:text-base">
      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col items-center justify-between gap-y-2 rounded-md bg-slate-600 px-4 py-4 text-white md:flex-row">
        <div className="w-full text-center md:text-left">
          {t('transfers_page.current_rewards')}
          {rewardsStr}
        </div>
        {isOwner && (
          <Button
            className="h-fit flex-shrink-0 text-sm md:text-base"
            variant="redHover"
            onClick={() => claimRewards()}
            disabled={claimRewardsMutation.isLoading}
          >
            {t('transfers_page.redeem_rewards')}
            {claimRewardsMutation.isLoading ? <CircleSpinner size={18} color="#dc2626" /> : null}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RewardsBanner;
