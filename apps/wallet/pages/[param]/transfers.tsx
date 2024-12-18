import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import {
  getAccount,
  getDynamicGlobalProperties,
  getFeedHistory,
  getFindAccounts
} from '@transaction/lib/hive';
import moment from 'moment';
import { getAccountHistory, getOpenOrder } from '@/wallet/lib/hive';
import { getCurrentHpApr, getFilter } from '@/wallet/lib/utils';
import { delegatedHive, vestingHive, powerdownHive, handleError } from '@ui/lib/utils';
import { numberWithCommas } from '@ui/lib/utils';
import { dateToFullRelative } from '@ui/lib/parse-date';
import { convertStringToBig } from '@ui/lib/helpers';
import { AccountHistory } from '@/wallet/store/app-types';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import Loading from '@ui/components/loading';
import TransfersHistoryFilter, { TransferFilters } from '@/wallet/components/transfers-history-filter';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { TransferDialog } from '@/wallet/components/transfer-dialog';
import useFilters from '@/wallet/components/hooks/use-filters';
import { getTranslations } from '../../lib/get-translations';
import FinancialReport from '@/wallet/components/financial-report';
import { useClaimRewardsMutation } from '@/wallet/components/hooks/use-claim-rewards-mutation';
import { useMemo } from 'react';
import { useCancelPowerDownMutation } from '@/wallet/components/hooks/use-power-hive-mutation';

const initialFilters: TransferFilters = {
  search: '',
  others: false,
  incoming: false,
  outcoming: false,
  exlude: false
};
type Transfer = {
  type: 'transfer';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type ClaimRewardBalance = {
  type: 'claim_reward_balance';
  memo?: string;
  account?: string;
  reward_hbd: Big;
  reward_hive: Big;
  reward_vests: Big;
};
type TransferFromSavings = {
  type: 'transfer_from_savings';
  amount?: string;
  from?: string;
  memo?: string;
  request_id?: number;
  to?: string;
};
type TransferToSavings = {
  type: 'transfer_to_savings';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type Interest = {
  type: 'interest';
  interest?: string;
  is_saved_into_hbd_balance?: boolean;
  memo?: string;
  owner?: string;
};
type CancelTransferFromSavings = {
  type: 'cancel_transfer_from_savings';
  from?: string;
  memo?: string;
  request_id?: number;
};
type FillOrder = {
  type: 'fill_order';
  current_orderid?: number;
  current_owner?: string;
  current_pays?: string;
  memo?: string;
  open_orderid?: number;
  open_owner?: string;
  open_pays?: string;
};
type TransferToVesting = {
  type: 'transfer_to_vesting';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};

type Operation =
  | Transfer
  | ClaimRewardBalance
  | TransferFromSavings
  | TransferToSavings
  | Interest
  | CancelTransferFromSavings
  | TransferToVesting
  | FillOrder;

const mapToAccountHistoryObject = ([id, data]: AccountHistory) => {
  const { op, ...rest } = data;
  let operation: Operation | undefined;
  if (!op) operation = undefined;
  if (op) {
    switch (op[0]) {
      default:
        operation = undefined;
      case 'transfer':
        operation = {
          type: 'transfer',
          amount: op[1].amount,
          from: op[1].from,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'claim_reward_balance':
        operation = {
          type: 'claim_reward_balance',
          account: op[1].account,
          reward_hbd: convertStringToBig(op[1]?.reward_hbd ?? '0'),
          reward_hive: convertStringToBig(op[1]?.reward_hive ?? '0'),
          reward_vests: convertStringToBig(op[1]?.reward_vests ?? '0')
        };
        break;
      case 'transfer_from_savings':
        operation = {
          type: 'transfer_from_savings',
          amount: op[1].amount,
          from: op[1].from,
          request_id: op[1].request_id,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'transfer_to_savings':
        operation = {
          type: 'transfer_to_savings',
          amount: op[1].amount,
          from: op[1].from,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'transfer_to_vesting':
        operation = { type: 'transfer_to_vesting', amount: op[1].amount, from: op[1].from, to: op[1].to };
        break;
      case 'interest':
        operation = {
          type: 'interest',
          interest: op[1].interest,
          is_saved_into_hbd_balance: op[1].is_saved_into_hbd_balance,
          owner: op[1].owner
        };
        break;
      case 'cancel_transfer_from_savings':
        operation = { type: 'cancel_transfer_from_savings', from: op[1].from, request_id: op[1].request_id };
        break;
      case 'fill_order':
        operation = { type: 'fill_order', current_pays: op[1].current_pays, open_pays: op[1].open_pays };
        break;
    }
  }
  return { id, ...rest, operation };
};

export type AccountHistoryData = ReturnType<typeof mapToAccountHistoryObject>;

function TransfersPage({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const [rawFilter, filter, setFilter] = useFilters(initialFilters);
  const { user } = useUser();
  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['accountData', username],
    () => getAccount(username),
    {
      enabled: Boolean(username)
    }
  );
  const { data: openOrdersData, isLoading: openOrdersLoading } = useQuery(
    ['openOrders', user?.username],
    () => getOpenOrder(user!.username),
    {
      enabled: Boolean(user?.username)!
    }
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(['dynamicGlobalProperties'], () =>
    getDynamicGlobalProperties()
  );
  const { data: accountHistoryData, isLoading: accountHistoryLoading } = useQuery(
    ['accountHistory', username],
    () => getAccountHistory(username, -1, 500),
    {
      select: (data) => data.map(mapToAccountHistoryObject)
    }
  );
  const { data: historyFeedData, isLoading: historyFeedLoading } = useQuery(['feedHistory'], () =>
    getFeedHistory()
  );

  const claimRewardsMutation = useClaimRewardsMutation();
  const cancelPowerDownMutation = useCancelPowerDownMutation();

  const rewardsStr = useMemo(() => {
    const allRewards = [
      accountData?.reward_hive_balance,
      accountData?.reward_hbd_balance,
      accountData?.reward_vesting_hive.replace('HIVE', 'HP')
    ].filter((reward) => Number(reward?.split(' ')[0]) > 0);

    return allRewards.length > 2
      ? `${allRewards[0]}, ${allRewards[1]} ${t('global.and')} ${allRewards[2]}`
      : allRewards.join(` ${t('global.and')} `);
  }, [
    accountData?.reward_hbd_balance,
    accountData?.reward_hive_balance,
    accountData?.reward_vesting_hive,
    t
  ]);

  if (
    accountLoading ||
    dynamicLoading ||
    historyFeedLoading ||
    !accountData ||
    !dynamicData ||
    !historyFeedData
  ) {
    return (
      <Loading
        loading={
          accountLoading ||
          dynamicLoading ||
          historyFeedLoading ||
          !accountData ||
          !dynamicData ||
          !historyFeedData
        }
      />
    );
  }

  const totalFund = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const price_per_hive = Big(
    Number(historyFeedData?.current_median_history.base.amount) *
      10 ** -historyFeedData?.current_median_history.base.precision
  );
  const totalDays = moment(accountData.next_vesting_withdrawal).diff(moment(), `d`);
  const totalShares = convertStringToBig(dynamicData.total_vesting_shares);
  const vesting_hive = vestingHive(accountData, dynamicData);
  const delegated_hive = delegatedHive(accountData, dynamicData);
  const powerdown_hive = powerdownHive(accountData, dynamicData);
  const received_power_balance =
    (delegated_hive.lt(0) ? '+' : '') + numberWithCommas((-delegated_hive).toFixed(3));
  const saving_balance_hive = convertStringToBig(accountData.savings_balance);
  const hbd_balance = convertStringToBig(accountData.hbd_balance);
  const hbd_balance_savings = convertStringToBig(accountData.savings_hbd_balance);
  const balance_hive = convertStringToBig(accountData.balance);
  const savings_hbd_pending = 0; //from withdraw?
  const hbdOrders = 0; // from openOrdersData
  const conversionValue = 0; //??
  const savings_pending = 0; //from withdraw?
  const hiveOrders = 0; // from openOrdersData
  const total_hbd = hbd_balance
    .plus(hbd_balance_savings)
    .plus(savings_hbd_pending)
    .plus(hbdOrders)
    .plus(conversionValue);
  const total_hive = vesting_hive
    .plus(balance_hive)
    .plus(saving_balance_hive)
    .plus(savings_pending)
    .plus(hiveOrders);
  const total_value = numberWithCommas(total_hive.times(price_per_hive).plus(total_hbd).toFixed(2));

  const filteredHistoryList = accountHistoryData?.filter(
    getFilter({ filter, totalFund, username, totalShares })
  );

  const amount = {
    hive: numberWithCommas(balance_hive.toFixed(3)) + ' Hive',
    hbd: '$' + numberWithCommas(hbd_balance.toFixed(3)),
    hp: numberWithCommas(vesting_hive.toFixed(3)) + ' Hive',
    savingsHive: saving_balance_hive.toFixed(3) + ' Hive',
    savingsHbd: '$' + numberWithCommas(hbd_balance_savings.toFixed(3))
  };

  const claimRewards = async () => {
    const accounts = await getFindAccounts(username);
    const params = { account: accounts.accounts[0] };
    try {
      await claimRewardsMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'claim_reward_balance', params });
    }
  };

  const cancelPowerDown = async () => {
    const params = { account: username };
    try {
      await cancelPowerDownMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'withdraw_vesting', params });
    }
  };

  function historyItemDescription(operation: Operation) {
    switch (operation.type) {
      case 'claim_reward_balance':
        const powerHP = totalFund.times(operation.reward_vests.div(totalShares));
        const displayHBD = operation.reward_hbd.gt(0);
        const displayHIVE = operation.reward_hive.gt(0);
        return (
          <span>
            {t('profil.claim_rewards')}
            {displayHBD && (
              <span>{operation.reward_hbd.toString() + ' HBD ' + (displayHIVE ? ',' : t('profil.and'))}</span>
            )}
            {displayHIVE && <span>{operation.reward_hive.toString() + ' HIVE' + t('profil.and')}</span>}
            {powerHP.toFixed(3)}
            {' HIVE POWER'}
          </span>
        );
      case 'transfer_from_savings':
        return (
          <span>
            {t('profil.transfer_from_savings_to', { value: operation.amount?.toString() })}
            <Link href={`/@${operation.to}`} className="font-semibold text-primary hover:text-destructive">
              {operation.to}
            </Link>
            {t('profil.request_id', { value: operation.request_id })}
          </span>
        );
      case 'transfer':
        if (operation.to === username)
          return (
            <span>
              {t('profil.received_from_user', { value: operation.amount?.toString() })}
              <Link
                href={`/@${operation.from}`}
                className="font-semibold text-primary hover:text-destructive"
              >
                {operation.from}
              </Link>
            </span>
          );
        if (operation.from === username)
          return (
            <span>
              {t('profil.transfer_to_user', { value: operation.amount?.toString() })}
              <Link href={`/@${operation.to}`} className="font-semibold text-primary hover:text-destructive">
                {operation.to}
              </Link>
            </span>
          );
      case 'transfer_to_savings':
        return (
          <span>
            {t('profil.transfer_to_savings_to', { value: operation.amount?.toString() })}
            <Link href={`/@${operation.to}`} className="font-semibold text-primary hover:text-destructive">
              {operation.to}
            </Link>
          </span>
        );
      case 'transfer_to_vesting':
        return (
          <span>
            {t('profil.transfer_to', { value: operation.amount?.toString() })}
            <Link href={`/@${operation.to}`} className="font-semibold text-primary hover:text-destructive">
              {operation.to}
            </Link>
          </span>
        );
      case 'interest':
        return <span>{t('profil.cancel_transfer_from_savings', { number: operation.interest })}</span>;
      case 'cancel_transfer_from_savings':
        return <span>{t('profil.cancel_transfer_from_savings', { number: operation.request_id })}</span>;
      case 'fill_order':
        return (
          <span>{t('profil.paid_for', { value1: operation.current_pays, value2: operation.open_pays })}</span>
        );
      default:
        return <div>error</div>;
    }
  }

  return (
    <ProfileLayout>
      <div className="flex w-full flex-col items-center ">
        <WalletMenu username={username} />
        {!!rewardsStr.length && (
          <div className="mx-auto w-full px-2 text-sm md:px-0 md:text-base">
            <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col items-center justify-between gap-y-2 rounded-md bg-slate-600 px-4 py-4 md:flex-row">
              <div className="w-full text-center md:text-left">
                {t('transfers_page.current_rewards')}
                {rewardsStr}
              </div>
              <Button
                className="h-fit flex-shrink-0 text-sm md:text-base"
                variant="redHover"
                onClick={() => claimRewards()}
              >
                {t('transfers_page.redeem_rewards')}
              </Button>
            </div>
          </div>
        )}
        <div>
          {user?.username === username && (
            <Link href="https://blocktrades.us" target="_blank">
              <Button variant="outlineRed" className="mx-2 my-8 border-destructive text-destructive">
                Buy HIVE or HIVE POWER
              </Button>
            </Link>
          )}
          <table className="max-w-6xl text-sm">
            <tbody>
              <tr className="flex flex-col py-2 sm:table-row">
                <td className="px-2 sm:px-4 sm:py-4">
                  <div className="font-semibold">HIVE</div>
                  <p
                    className="text-xs leading-relaxed text-primary/70"
                    data-testid="wallet-hive-description"
                  >
                    {t('profil.hive_description')}
                  </p>
                </td>
                <td className="whitespace-nowrap font-semibold" data-testid="wallet-hive-value">
                  {user?.username === username ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <div>
                            <span className="text-destructive">{amount.hive.toUpperCase()}</span>
                            <span className="m-1 text-xl">▾</span>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuGroup>
                          <TransferDialog
                            currency={'hive'}
                            amount={amount}
                            type="transfers"
                            username={user?.username}
                          >
                            Transfer
                          </TransferDialog>
                          <TransferDialog
                            currency={'hive'}
                            amount={amount}
                            type="transferTo"
                            username={user?.username}
                          >
                            Transfers to Savings
                          </TransferDialog>
                          <TransferDialog
                            currency={'hive'}
                            amount={amount}
                            type="powerUp"
                            username={user?.username}
                          >
                            Power up
                          </TransferDialog>
                          <DropdownMenuItem className="p-0">
                            <Link href="/market" className="w-full px-2 py-1.5">
                              Market
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <Link
                              href="https://blocktrades.us"
                              target="_blank"
                              className="w-full px-2 py-1.5"
                            >
                              Buy
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <Link
                              href="https://blocktrades.us"
                              target="_blank"
                              className="w-full px-2 py-1.5"
                            >
                              Sell
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="px-4 py-2">{amount.hive}</div>
                  )}
                </td>
              </tr>
              <tr className="flex flex-col bg-background-secondary py-2 sm:table-row">
                <td className="px-2 sm:px-4 sm:py-4">
                  <div className="font-semibold">HIVE POWER</div>
                  <p
                    className="text-xs leading-relaxed text-primary/70"
                    data-testid="wallet-hive-power-description"
                  >
                    {t('profil.hp_description', {
                      username: accountData.name,
                      value: getCurrentHpApr(dynamicData).toFixed(2)
                    })}
                    <span className="font-semibold text-primary hover:text-destructive">
                      <Link href="https://hive.blog/faq.html#How_many_new_tokens_are_generated_by_the_blockchain">
                        {t('profil.see_faq_for_details')}
                      </Link>
                    </span>
                  </p>
                </td>
                <td
                  className="whitespace-nowrap bg-background-secondary font-semibold"
                  data-testid="wallet-hive-power"
                >
                  {user?.username === username ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <div>
                            <span className="text-destructive">{amount.hp.toUpperCase()}</span>
                            <span className="m-1 text-xl">▾</span>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuGroup>
                          <TransferDialog
                            currency={'hive'}
                            amount={amount}
                            type="powerDown"
                            username={user?.username}
                          >
                            <span>Power Down</span>
                          </TransferDialog>
                          <TransferDialog
                            currency={'hive'}
                            amount={amount}
                            type="delegate"
                            username={user?.username}
                          >
                            <span>Delegate</span>
                          </TransferDialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-background-tertiary hover:text-primary">
                                <span>Cancel Power Down</span>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="text-left sm:max-w-[425px]">
                              Are you sure you want to cancel Power Down?
                              <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
                                <DialogTrigger asChild>
                                  <Button variant="redHover" onClick={cancelPowerDown}>
                                    Cancel Power Down
                                  </Button>
                                </DialogTrigger>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="px-4 py-2">{amount.hp.toUpperCase()}</div>
                  )}
                  {Number(received_power_balance) !== 0 && (
                    <div className="px-4">({received_power_balance + ' HIVE'})</div>
                  )}
                </td>
              </tr>
              <tr className="flex flex-col py-2 sm:table-row">
                <td className="px-2 sm:px-4 sm:py-4">
                  <div className="font-semibold">HIVE DOLLARS</div>
                  <p
                    className="text-xs leading-relaxed text-primary/70"
                    data-testid="wallet-hive-dollars-description"
                  >
                    {t('profil.hive_dolar_description')}
                  </p>
                </td>
                <td className="whitespace-nowrap font-semibold" data-testid="wallet-hive-dallars-value">
                  {user?.username === username ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost">
                          <div>
                            <span className="text-destructive">{amount.hbd}</span>
                            <span className="m-1 text-xl">▾</span>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuGroup>
                          <TransferDialog
                            currency={'hbd'}
                            amount={amount}
                            type="transfers"
                            username={user?.username}
                          >
                            Transfer
                          </TransferDialog>
                          <TransferDialog
                            currency={'hbd'}
                            amount={amount}
                            type="transferTo"
                            username={user?.username}
                          >
                            Transfers to Savings
                          </TransferDialog>

                          <DropdownMenuItem className="p-0">
                            <Link href="/market" className="w-full px-2 py-1.5">
                              Market
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <Link
                              href="https://blocktrades.us"
                              target="_blank"
                              className="w-full px-2 py-1.5"
                            >
                              Buy
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="p-0">
                            <Link
                              href="https://blocktrades.us"
                              target="_blank"
                              className="w-full px-2 py-1.5"
                            >
                              Sell
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="px-4 py-2">{amount.hbd}</div>
                  )}
                </td>
              </tr>
              <tr className=" flex flex-col bg-background-secondary sm:table-row">
                <td className="px-2 sm:px-4 sm:py-4">
                  <div className="font-semibold">{t('profil.savings_title')}</div>
                  <p
                    className="text-xs leading-relaxed text-primary/70"
                    data-testid="wallet-savings-description"
                  >
                    {t('profil.savings_description')}
                    <span className="font-semibold text-primary hover:text-destructive">
                      {<Link href={`/~witnesses`}>{t('profil.witnesses')}</Link>}
                    </span>
                    {')'}
                  </p>
                </td>
                <td className="whitespace-nowrap bg-background-secondary font-semibold">
                  {user?.username === username ? (
                    <div className="flex w-fit flex-col items-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost">
                            <div>
                              <span className="text-destructive">{amount.savingsHive.toUpperCase()}</span>
                              <span className="m-1 text-xl">▾</span>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <TransferDialog
                              currency={'hive'}
                              amount={amount}
                              type="withdrawHive"
                              username={user?.username}
                            >
                              <span>Withdraw Hive</span>
                            </TransferDialog>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost">
                            <div>
                              <span className="text-destructive">{amount.savingsHbd}</span>
                              <span className="m-1 text-xl">▾</span>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <TransferDialog
                              currency={'hbd'}
                              amount={amount}
                              type="withdrawHiveDollars"
                              username={user?.username}
                            >
                              <span>Withdraw Hive Dollars</span>
                            </TransferDialog>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <div data-testid="wallet-saving-hive-value">{amount.savingsHive}</div>
                      <div data-testid="walled-hbd-saving-value">{amount.savingsHbd}</div>
                    </div>
                  )}
                </td>
              </tr>
              <tr className="flex flex-col py-2 sm:table-row">
                <td className="px-2 sm:px-4 sm:py-4">
                  <div className="font-semibold">{t('profil.estimated_account_value_title')}</div>
                  <p
                    className="text-xs leading-relaxed text-primary/70"
                    data-testid="wallet-estimated-account-value-description"
                  >
                    {t('profil.estimated_account_value_description')}
                  </p>
                </td>
                <td
                  className="whitespace-nowrap px-4 py-2 font-semibold"
                  data-testid="wallet-estimated-account-value"
                >
                  {'$' + total_value}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {powerdown_hive.gt(0) ? (
          <div className="p-2 text-sm sm:p-4">
            {t('profil.the_next_power_down')} {totalDays} {totalDays !== 1 ? ' days' : 'day'}(~
            {numberWithCommas(powerdown_hive.toFixed(3))} HIVE)
          </div>
        ) : null}
        <div className="w-full max-w-6xl">
          {user.username === username && <FinancialReport username={user.username} />}
          <TransfersHistoryFilter
            onFiltersChange={(value) => {
              setFilter((prevFilters) => ({
                ...prevFilters,
                ...value
              }));
            }}
            value={rawFilter}
          />
          <div className="p-2 sm:p-4">
            <div className="font-semibold">{t('profil.account_history_title')}</div>
            <p
              className="text-xs leading-relaxed text-primary/70"
              data-testid="wallet-account-history-description"
            >
              {t('profil.account_history_description')}
            </p>
            <HistoryTable
              isLoading={accountHistoryLoading}
              historyList={filteredHistoryList}
              historyItemDescription={historyItemDescription}
              t={t}
            />
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}

interface HistoryTableProps {
  isLoading: boolean;
  historyList: AccountHistoryData[] | undefined;
  historyItemDescription: (operation: Operation) => JSX.Element;
  t: TFunction<'common_wallet', undefined>;
}

const HistoryTable = ({ t, isLoading, historyList = [], historyItemDescription }: HistoryTableProps) => {
  if (isLoading) return <div>{t('global.loading')}</div>;
  if (historyList.length === 0)
    return (
      <div
        className="py-12 text-center text-3xl text-red-300"
        data-testid="wallet-account-history-no-transacions-found"
      >
        {t('profil.no_transactions_found')}
      </div>
    );

  return (
    <table className="w-full max-w-6xl p-2">
      <tbody>
        {[...historyList].reverse().map(
          (element) =>
            element.operation && (
              <tr
                key={element.id}
                className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
                data-testid="wallet-account-history-row"
              >
                <td className="px-4 py-2 sm:min-w-[150px]">{dateToFullRelative(element.timestamp, t)}</td>
                <td className="px-4 py-2 sm:min-w-[300px]">{historyItemDescription(element.operation)}</td>
                {element.operation.memo ? (
                  <td className="hidden break-all px-4 py-2 sm:block">{element.operation.memo}</td>
                ) : (
                  <td></td>
                )}
              </tr>
            )
        )}
      </tbody>
    </table>
  );
};

export default TransfersPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
