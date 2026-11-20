import type { GetDynamicGlobalPropertiesResponse, NaiAsset } from '@hiveio/wax';
import Big from 'big.js';
import { convertStringToBig } from '@ui/lib/helpers';
import { convertToHP } from '@ui/lib/utils';
import { formatAsset, isNaiAsset } from '@ui/lib/asset-format';
import { formatAmount } from '@ui/lib/locale-format';
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
    dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
    locale: string
  ) => string[];
  /** One line per asset paid by a single reward. */
  payoutLines: (
    op: RewardOp,
    dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
    locale: string
  ) => string[];
}

function hivePowerOf(vests: unknown, dynamicData: GetDynamicGlobalPropertiesResponse | undefined): Big {
  return isNaiAsset(vests) && dynamicData
    ? convertToHP(vests, dynamicData.total_vesting_shares, dynamicData.total_vesting_fund_hive)
    : Big(0);
}

function formattedHivePowerOf(
  vests: NaiAsset | undefined,
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
  locale: string
) {
  return vests && dynamicData
    ? convertToFormattedHivePower(
        vests,
        dynamicData.total_vesting_fund_hive,
        dynamicData.total_vesting_shares,
        locale
      )
    : '0';
}

function authorWeeklyTotals(
  rewards: RewardEntry[],
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
  locale: string
): string[] {
  const totals = rewards.reduce(
    (total, { op }) => ({
      hbd: total.hbd.plus(convertStringToBig(op.hbd_payout ?? '0')),
      hive: total.hive.plus(convertStringToBig(op.hive_payout ?? '0')),
      hp: total.hp.plus(hivePowerOf(op.vesting_payout, dynamicData))
    }),
    { hbd: Big(0), hive: Big(0), hp: Big(0) }
  );
  return [
    formatAmount(totals.hp, 'HIVE POWER', locale),
    formatAmount(totals.hive, 'HIVE', locale),
    formatAmount(totals.hbd, 'HBD', locale)
  ];
}

function curationWeeklyTotals(
  rewards: RewardEntry[],
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
  locale: string
): string[] {
  const hp = rewards.reduce((total, { op }) => total.plus(hivePowerOf(op.reward, dynamicData)), Big(0));
  // Six decimals until the Condenser API is gone and precision is handled properly.
  return [formatAmount(hp, 'HIVE POWER', locale, 6)];
}

function authorPayoutLines(
  op: RewardOp,
  dynamicData: GetDynamicGlobalPropertiesResponse | undefined,
  locale: string
): string[] {
  return [
    formattedHivePowerOf(op.vesting_payout, dynamicData, locale),
    isNaiAsset(op.hive_payout) ? formatAsset(op.hive_payout, { locale }) : '',
    isNaiAsset(op.hbd_payout) ? formatAsset(op.hbd_payout, { locale }) : ''
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
    payoutLines: (op, dynamicData, locale) => [formattedHivePowerOf(op.reward, dynamicData, locale)]
  }
};
