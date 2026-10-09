import type { GetDynamicGlobalPropertiesResponse, NaiAsset } from '@hiveio/wax';
import Big from 'big.js';
import { convertStringToBig } from '@ui/lib/helpers';
import { convertToHP } from '@ui/lib/utils';
import { formatAsset, isNaiAsset } from '@ui/lib/asset-format';
import { convertToFormattedHivePower } from '@/wallet/lib/utils';
import type { useRewardsHistory } from '@/wallet/components/hooks/use-rewards-history';

export type RewardType = 'author' | 'curation';

export type RewardEntry = NonNullable<ReturnType<typeof useRewardsHistory>['data']>[number];
type RewardOp = RewardEntry['op'];

interface RewardTypeConfig {
  opType: 'author_reward_operation' | 'curation_reward_operation';
  estimatedLastWeekKey: string;
  historyKey: string;
  potentialTitleKey: string;
  titleKey: string;
  /** Whether a row links the author of the post the reward was earned on. */
  linksPostAuthor: boolean;
  descriptionClassName?: string;
  /** One line per asset of the summed rewards. */
  weeklyTotals: (
    rewards: RewardEntry[],
    dynamicData: GetDynamicGlobalPropertiesResponse | undefined
  ) => string[];
  /** One line per asset paid by a single reward. */
  payoutLines: (op: RewardOp, dynamicData: GetDynamicGlobalPropertiesResponse | undefined) => string[];
}

function hivePowerOf(vests: unknown, dynamicData: GetDynamicGlobalPropertiesResponse | undefined): Big {
  return isNaiAsset(vests) && dynamicData
    ? convertToHP(vests, dynamicData.total_vesting_shares, dynamicData.total_vesting_fund_hive)
    : Big(0);
}

function formattedHivePowerOf(
  vests: NaiAsset | undefined,
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined
) {
  return vests && dynamicData
    ? convertToFormattedHivePower(
        vests,
        dynamicData.total_vesting_fund_hive,
        dynamicData.total_vesting_shares
      )
    : '0';
}

function authorWeeklyTotals(
  rewards: RewardEntry[],
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined
): string[] {
  const totals = rewards.reduce(
    (total, { op }) => ({
      hbd: Number(Big(total.hbd).plus(convertStringToBig(op.hbd_payout ?? '0'))),
      hive: Number(Big(total.hive).plus(convertStringToBig(op.hive_payout ?? '0'))),
      hp: Number(Big(total.hp).plus(hivePowerOf(op.vesting_payout, dynamicData)))
    }),
    { hbd: 0, hive: 0, hp: 0 }
  );
  return [
    `${totals.hp.toFixed(3)} HIVE POWER`,
    `${totals.hive.toFixed(3)} HIVE`,
    `${totals.hbd.toFixed(3)} HBD`
  ];
}

function curationWeeklyTotals(
  rewards: RewardEntry[],
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined
): string[] {
  const hp = rewards.reduce(
    (total, { op }) => Number(Big(total).plus(hivePowerOf(op.reward, dynamicData))),
    0
  );
  // Six decimals until the Condenser API is gone and precision is handled properly.
  return [`${hp.toFixed(6)} HIVE POWER`];
}

function authorPayoutLines(
  op: RewardOp,
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined
): string[] {
  return [
    formattedHivePowerOf(op.vesting_payout, dynamicData),
    isNaiAsset(op.hive_payout) ? formatAsset(op.hive_payout) : '',
    isNaiAsset(op.hbd_payout) ? formatAsset(op.hbd_payout) : ''
  ];
}

export const REWARD_TYPES: Record<RewardType, RewardTypeConfig> = {
  author: {
    opType: 'author_reward_operation',
    estimatedLastWeekKey: 'profile.estimated_author_rewards_last_week',
    historyKey: 'profile.author_rewards_history',
    potentialTitleKey: 'profile.potential_author_rewards_title',
    titleKey: 'profile.author_rewards_title',
    linksPostAuthor: false,
    descriptionClassName: 'flex items-center gap-1',
    weeklyTotals: authorWeeklyTotals,
    payoutLines: authorPayoutLines
  },
  curation: {
    opType: 'curation_reward_operation',
    estimatedLastWeekKey: 'profile.estimated_curation_rewards_last_week',
    historyKey: 'profile.curation_rewards_history',
    potentialTitleKey: 'profile.potential_curation_reward_title',
    titleKey: 'profile.curation_reward_title',
    linksPostAuthor: true,
    weeklyTotals: curationWeeklyTotals,
    payoutLines: (op, dynamicData) => [formattedHivePowerOf(op.reward, dynamicData)]
  }
};
