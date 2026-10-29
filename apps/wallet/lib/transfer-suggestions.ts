import type { TFunction } from 'i18next';
import type { IFollow, HiveOperation } from '@hive/common-hiveio-packages/wax';

const counterpartyOf = ({ op }: HiveOperation, username: string): string | undefined => {
  const value = op?.value;
  if (!value) return undefined;
  const other = (account?: string) => (account !== username ? account : undefined);

  switch (op.type) {
    case 'transfer_operation':
    case 'transfer_to_savings_operation':
    case 'transfer_from_savings_operation':
    case 'transfer_to_vesting_operation':
      return other(value.from) ?? other(value.to);
    case 'claim_reward_balance_operation':
      return other(value.account);
    case 'interest_operation':
      return other(value.owner);
    case 'cancel_transfer_from_savings_operation':
      return other(value.from);
    case 'fill_order_operation':
      return other(value.current_owner);
  }
  return undefined;
};

/**
 * The accounts suggested in the wallet's "To" fields: the counterparties of `username`'s history,
 * most frequent first, followed by the accounts `username` follows.
 */
export function createListWithSuggestions(
  username: string,
  t: TFunction<'common_wallet', undefined>,
  transferHistory?: HiveOperation[],
  followingList?: IFollow[]
): { username: string; about: string }[] {
  const following =
    followingList?.map((e) => ({ username: e.following, about: t('profile.following') })) ?? [];
  const counters = new Map<string, number>();
  for (const operation of transferHistory ?? []) {
    const accountName = counterpartyOf(operation, username);
    if (accountName) counters.set(accountName, (counters.get(accountName) ?? 0) + 1);
  }
  const transfers = [...counters.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([accountName, counter]) => ({
      username: accountName,
      about: `${counter} ${t('profile.previous_transfers')}`
    }));
  return [...transfers, ...following];
}
