import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import {
  getAccount,
  getDynamicGlobalProperties,
  getFeedHistory,
  getFindAccounts,
  getFollowing
} from '@transaction/lib/hive';
import moment from 'moment';
import { getAccountOperations, getSavingsWithdrawals } from '@/wallet/lib/hive';
import {
  convertToFormattedHivePower,
  createListWithSuggestions,
  getAmountFromWithdrawal,
  getCurrentHpApr,
  getFilter
} from '@/wallet/lib/utils';
import { powerdownHive, cn, convertToHP, numberWithCommas } from '@ui/lib/utils';
import { convertStringToBig } from '@ui/lib/helpers';
import { AccountHistory, HiveOperation } from '@transaction/lib/extended-hive.chain';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import Loading from '@ui/components/loading';
import TransfersHistoryFilter from '@/wallet/components/transfers-history-filter';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { useTranslation } from 'next-i18next';
import WalletMenu from '@/wallet/components/wallet-menu';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@ui/components';
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
import { getAccountMetadata, getTranslations } from '@/wallet/lib/get-translations';
import FinancialReport from '@/wallet/components/financial-report';
import { useClaimRewardsMutation } from '@/wallet/components/hooks/use-claim-rewards-mutation';
import { useMemo, useState } from 'react';
import { useCancelPowerDownMutation } from '@/wallet/components/hooks/use-power-hive-mutation';
import env from '@beam-australia/react-env';
import { useCancelTransferFromSavingsMutation } from '@/wallet/components/hooks/use-cancel-transfer-from-savings-mutation';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { toast } from '@ui/components/hooks/use-toast';
import Head from 'next/head';
import TimeAgo from '@hive/ui/components/time-ago';
import HistoryTable from '@/wallet/feature/transfers-page/history-table';
import RCRow from '@/wallet/feature/transfers-page/rc-row';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';

const initialFilters: TransferFilters = {
  search: '',
  others: false,
  incoming: false,
  outcoming: false,
  exlude: false
};

function TransfersPage({ username, metadata }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const blogURL = env('BLOG_DOMAIN');
  const [rawFilter, filter, setFilter] = useFilters(initialFilters);
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [openCancelTransfer, setOpenCancelTransfer] = useState(false);
  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['accountData', username],
    () => getAccount(username),
    {
      enabled: Boolean(username)
    }
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(['dynamicGlobalPropertiesData'], () =>
    getDynamicGlobalProperties()
  );

  const { data: followingData } = useQuery(['following', username], () =>
    getFollowing({ account: username })
  );

  const { data: operationHistoryData, isLoading: operationHistoryLoading } = useQuery(
    ['Operations', username],
    () => getAccountOperations(username, undefined, 500, user.username),
    {
      select: (data) => data.operations_result
    }
  );
  const { data: historyFeedData, isLoading: historyFeedLoading } = useQuery(['feedHistory'], () =>
    getFeedHistory()
  );

  const { data: withdrawals } = useQuery(['savingsWithdrawalsFrom', username], () =>
    getSavingsWithdrawals(username)
  );

  const listOfAccounts = createListWithSuggestions(username, t, operationHistoryData, followingData);

  const claimRewardsMutation = useClaimRewardsMutation();
  const cancelPowerDownMutation = useCancelPowerDownMutation();
  const cancelTransferFromSavingsMutation = useCancelTransferFromSavingsMutation();

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
  const hours = moment(accountData.next_vesting_withdrawal).diff(moment(), 'hours');
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const totalTime =
    days === 0
      ? `${remainingHours} ${t('global.time.hours')}`
      : `${days} ${t('global.time.days')} ${remainingHours} ${t('global.time.hours')}`;
  const totalShares = convertStringToBig(dynamicData.total_vesting_shares);
  const vesting_hive = convertToHP(
    convertStringToBig(accountData.vesting_shares),
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );
  const delegated_hive = convertToHP(
    convertStringToBig(accountData.delegated_vesting_shares).minus(
      convertStringToBig(accountData.received_vesting_shares)
    ),
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );
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
  const delegatedVesting = convertToHP(
    convertStringToBig(accountData.delegated_vesting_shares),
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );
  const hp = numberWithCommas(vesting_hive.toFixed(3)) + ' HIVE';
  const filteredHistoryList = operationHistoryData?.filter(
    getFilter({ filter, username })
  );

  const amount = {
    hive: numberWithCommas(balance_hive.toFixed(3)) + ' HIVE',
    hbd: '$' + numberWithCommas(hbd_balance.toFixed(3)),
    reducedHP: vesting_hive.minus(delegatedVesting).toFixed(3),
    savingsHive: saving_balance_hive.toFixed(3) + ' HIVE',
    savingsHbd: '$' + numberWithCommas(hbd_balance_savings.toFixed(3)),
    delegatedVesting: delegatedVesting,
    to_withdraw: convertToHP(
      Big(accountData.to_withdraw),
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive,
      1000000
    ),
    withdraw: convertToHP(
      Big(accountData.withdrawn),
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive,
      1000000
    )
  };

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

  const cancelPowerDown = async () => {
    const params = { account: username };
    try {
      await cancelPowerDownMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'withdraw_vesting', params });
    } finally {
      setOpen(false);
      toast({
        title: t('transfers_page.transaction_success'),
        description: t('transfers_page.cancel_power_down'),
        variant: 'success'
      });
    }
  };

  const cancelTransferFromSavings = async (requestId: number) => {
    const params = { fromAccount: username, requestId: requestId };
    try {
      await cancelTransferFromSavingsMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'cancel_transfer_from_savings', params });
    } finally {
      setOpenCancelTransfer(false);
      toast({
        title: t('transfers_page.transaction_success'),
        description: t('transfers_page.cancel__transfer_from_savings'),
        variant: 'success'
      });
    }
  };

  function operationsItemDescription(operation: HiveOperation) {
    const hiveChain = hiveChainService.reuseHiveChain();
    if (!hiveChain) return <></>;
    let formattedOperation = hiveChain.formatter.format(operation);
    const opValue = formattedOperation.op.value;
    switch (formattedOperation.op.type) {
      case 'claim_reward_balance_operation':
        const formattedHpClaimReward = convertToFormattedHivePower(
          operation!.op!.value!.reward_vests,
          dynamicData?.total_vesting_fund_hive,
          dynamicData?.total_vesting_shares,
          hiveChain
        );
        return (
          <span>
            {t('profile.claim_rewards')}
              <span>
                {`${opValue.reward_hbd} ${t('profile.and')}`}
              </span>
            {` ${opValue.reward_hive} ${t('profile.and')}`}
            {`${formattedHpClaimReward}`}
          </span>
        );
      case 'transfer_from_savings_operation':
        return (
          <span>
            {t('profile.transfer_from_savings_to', { value: opValue.amount?.toString() })}
            <Link href={`/@${opValue.to}`} className="font-semibold text-primary hover:text-destructive">
              {`${opValue.to} `}
            </Link>
            {t('profile.request_id', { value: opValue.request_id })}
          </span>
        );
      case 'transfer_operation':
        if (opValue.to === username)
          return (
            <span>
              {t('profile.received_from_user', { value: opValue.amount?.toString() })}
              <Link
                href={`/@${opValue.from}`}
                className="font-semibold text-primary hover:text-destructive"
              >
                {opValue.from}
              </Link>
            </span>
          );
        if (opValue.from === username)
          return (
            <span>
              {t('profile.transfer_to_user', { value: opValue.amount?.toString() })}
              <Link href={`/@${opValue.to}`} className="font-semibold text-primary hover:text-destructive">
                {opValue.to}
              </Link>
            </span>
          );
      case 'transfer_to_savings_operation':
        return (
          <span>
            {t('profile.transfer_to_savings_to', { value: opValue.amount?.toString() })}
            <Link href={`/@${opValue.to}`} className="font-semibold text-primary hover:text-destructive">
              {opValue.to}
            </Link>
          </span>
        );
      case 'transfer_to_vesting_operation':
        return opValue.from === username ? (
          <span>
            {t('profile.transfer_hp_to', { value: opValue.amount?.toString() })}
            <Link href={`/@${opValue.to}`} className="font-semibold text-primary hover:text-destructive">
              {opValue.to}
            </Link>
          </span>
        ) : (
          <span>
            {t('profile.transfer_hp_from', { value: opValue.amount?.toString() })}
            <Link href={`/@${opValue.from}`} className="font-semibold text-primary hover:text-destructive">
              {opValue.from}
            </Link>
          </span>
        );
      case 'interest_operation':
        return <span>{t('profile.cancel_transfer_from_savings', { number: opValue.interest })}</span>;
      case 'cancel_transfer_from_savings_operation':
        return <span>{t('profile.cancel_transfer_from_savings', { number: opValue.request_id })}</span>;
      case 'fill_order_operation':
        return (
          <span>
            {t('profile.paid_for', { value1: opValue.current_pays, value2: opValue.open_pays })}
          </span>
        );
      case 'withdraw_vesting_operation':
        const formattedHpWithdrawVesting = convertToFormattedHivePower(
          operation!.op!.value!.reward_vests,
          dynamicData?.total_vesting_fund_hive,
          dynamicData?.total_vesting_shares,
          hiveChain
        );
        return (
          <span>
            {opValue.amount && dynamicData
              ? t('profile.start_power_down', formattedHpWithdrawVesting)
              : t('profile.stop_power_down')}
          </span>
        );
      default:
        return <div>error</div>;
    }
  }

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
        <div className="flex w-full flex-col items-center ">
          <WalletMenu username={username} />
          {!!rewardsStr.length && user?.username === username && (
            <div className="mx-auto w-full px-2 text-sm md:px-0 md:text-base">
              <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col items-center justify-between gap-y-2 rounded-md bg-slate-600 px-4 py-4 text-white md:flex-row">
                <div className="w-full text-center md:text-left">
                  {t('transfers_page.current_rewards')}
                  {rewardsStr}
                </div>
                <Button
                  className="h-fit flex-shrink-0 text-sm md:text-base"
                  variant="redHover"
                  onClick={() => claimRewards()}
                  disabled={claimRewardsMutation.isLoading}
                >
                  {t('transfers_page.redeem_rewards')}
                  {claimRewardsMutation.isLoading ? <CircleSpinner size={18} color="#dc2626" /> : null}
                </Button>
              </div>
            </div>
          )}
          <div className="flex max-w-6xl flex-col text-sm">
            <table>
              <tbody>
                <tr className="flex flex-col py-2 sm:table-row">
                  <td className="px-2 sm:px-4 sm:py-4">
                    <div className="font-semibold">HIVE</div>
                    <p
                      className="text-xs leading-relaxed text-primary/70"
                      data-testid="wallet-hive-description"
                    >
                      {t('profile.hive_description')}
                    </p>
                  </td>
                  <td className="whitespace-nowrap font-semibold" data-testid="wallet-hive-value">
                    {user?.username === username ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost">
                            <div>
                              <span className="text-destructive">{amount.hive}</span>
                              <span className="m-1 text-xl">▾</span>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HIVE'}
                              amount={amount}
                              type="transfers"
                              username={user?.username}
                            >
                              {t('profile.transfer')}
                            </TransferDialog>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HIVE'}
                              amount={amount}
                              type="transferTo"
                              username={user?.username}
                            >
                              {t('profile.transfer_to_savings')}
                            </TransferDialog>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HIVE'}
                              amount={amount}
                              type="powerUp"
                              username={user?.username}
                            >
                              {t('profile.power_up')}
                            </TransferDialog>
                            <DropdownMenuItem className="p-0">
                              <Link href="/market" className="w-full px-2 py-1.5">
                                {t('profile.market')}
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
                      {t('profile.hp_description', {
                        username: accountData.name,
                        value: getCurrentHpApr(dynamicData).toFixed(2)
                      })}
                      <span className="font-semibold text-primary hover:text-destructive">
                        <Link
                          href={`${blogURL}/faq.html#How_many_new_tokens_are_generated_by_the_blockchain`}
                        >
                          {t('profile.see_faq_for_details')}
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
                              <span className="text-destructive">{hp}</span>
                              <span className="m-1 text-xl">▾</span>
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HIVE'}
                              amount={amount}
                              type="powerDown"
                              username={user?.username}
                            >
                              <span>{t('profile.power_down')}</span>
                            </TransferDialog>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HIVE'}
                              amount={amount}
                              type="delegate"
                              username={user?.username}
                            >
                              <span>{t('profile.delegate')}</span>
                            </TransferDialog>
                            {accountData.to_withdraw === 0 ? null : (
                              <Dialog open={open} onOpenChange={setOpen}>
                                <DialogTrigger asChild>
                                  <div className="w-full cursor-pointer px-2 py-1.5 text-sm hover:bg-background-tertiary hover:text-primary">
                                    <span>{t('profile.cancel_power_down')}</span>
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="text-left sm:max-w-[425px]">
                                  {t('profile.cancel_power_down_prompt')}
                                  <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
                                    <Button
                                      variant="redHover"
                                      onClick={cancelPowerDown}
                                      disabled={cancelPowerDownMutation.isLoading}
                                    >
                                      {cancelPowerDownMutation.isLoading ? (
                                        <CircleSpinner
                                          loading={cancelPowerDownMutation.isLoading}
                                          size={18}
                                          color="#dc2626"
                                        />
                                      ) : (
                                        t('profile.cancel_power_down')
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div className="px-4 py-2">{hp}</div>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {Number(received_power_balance) !== 0 && (
                            <div className="px-4">({received_power_balance + ' HIVE'})</div>
                          )}
                        </TooltipTrigger>
                        <TooltipContent className="font-normal">
                          {t('profile.delegated_tooltip')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                </tr>
                <tr className="flex flex-col py-2 sm:table-row">
                  <td className="px-2 sm:px-4 sm:py-4">
                    <div className="font-semibold">HIVE DOLLARS</div>
                    <p
                      className="text-xs leading-relaxed text-primary/70"
                      data-testid="wallet-hive-dollars-description"
                    >
                      {t('profile.hive_dolar_description')}
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
                              suggestedUsers={listOfAccounts}
                              currency={'HBD'}
                              amount={amount}
                              type="transfers"
                              username={user?.username}
                            >
                              {t('profile.transfer')}
                            </TransferDialog>
                            <TransferDialog
                              suggestedUsers={listOfAccounts}
                              currency={'HBD'}
                              amount={amount}
                              type="transferTo"
                              username={user?.username}
                            >
                              {t('profile.transfer_to_savings')}
                            </TransferDialog>

                            <DropdownMenuItem className="p-0">
                              <Link href="/market" className="w-full px-2 py-1.5">
                                {t('profile.market')}
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
                    <div className="font-semibold">{t('profile.savings_title')}</div>
                    <p
                      className="text-xs leading-relaxed text-primary/70"
                      data-testid="wallet-savings-description"
                    >
                      {t('profile.savings_description')}
                      <span className="font-semibold text-primary hover:text-destructive">
                        {<Link href={`/~witnesses`}>{t('profile.witnesses')}</Link>}
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
                                <span className="text-destructive">{amount.savingsHive}</span>
                                <span className="m-1 text-xl">▾</span>
                              </div>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuGroup>
                              <TransferDialog
                                suggestedUsers={listOfAccounts}
                                currency={'HIVE'}
                                amount={amount}
                                type="withdrawHive"
                                username={user?.username}
                              >
                                <span>{t('profile.withdraw_hive')}</span>
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
                                suggestedUsers={listOfAccounts}
                                currency={'HBD'}
                                amount={amount}
                                type="withdrawHiveDollars"
                                username={user?.username}
                              >
                                <span>{t('profile.withdraw_hive_dollars')}</span>
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
                    <div className="font-semibold">{t('profile.estimated_account_value_title')}</div>
                    <p
                      className="text-xs leading-relaxed text-primary/70"
                      data-testid="wallet-estimated-account-value-description"
                    >
                      {t('profile.estimated_account_value_description')}
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
            <RCRow username={username} />
          </div>
          {powerdown_hive.gt(0) ? (
            <div className="p-2 text-sm sm:p-4">
              {`${t('profile.the_next_power_down')} ${totalTime} (~${numberWithCommas(powerdown_hive.toFixed(3))} HIVE)`}
            </div>
          ) : null}
          <div className="w-full max-w-6xl">
            {!!withdrawals?.withdrawals.length && (
              <div className="flex flex-col">
                <div className="p-2 font-semibold sm:p-4">{t('transfers_page.pending_savings')}</div>
                <table className="max-w-6xl text-sm">
                  <tbody>
                    {withdrawals?.withdrawals.map((withdrawal, index) => {
                      const withdrawMessage = `${t('transfers_page.withdraw')} ${getAmountFromWithdrawal(withdrawal)} ${t('transfers_page.to_lower')} ${withdrawal.to}`;
                      return (
                        <tr
                          className={cn('flex flex-col py-2 sm:table-row', {
                            'bg-background-secondary': index % 2 === 0
                          })}
                          key={withdrawal.id}
                        >
                          <td className="px-2 sm:px-4 sm:py-2">
                            <TimeAgo date={withdrawal.complete} />
                          </td>
                          <td className="flex flex-row items-center px-2 sm:px-4 sm:py-2">
                            <div>{withdrawMessage}</div>
                            <Dialog open={openCancelTransfer} onOpenChange={setOpenCancelTransfer}>
                              <DialogTrigger asChild>
                                <Button variant="link" className="text-destructive hover:no-underline">
                                  {t('transfers_page.cancel')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="text-left sm:max-w-[425px]">
                                <div className="flex flex-col gap-y-2">
                                  <div>{t('transfers_page.cancel_withdraw_request')}</div>
                                  <div>{withdrawMessage}</div>
                                </div>
                                <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
                                  <Button
                                    variant="redHover"
                                    onClick={() => cancelTransferFromSavings(withdrawal.request_id)}
                                    disabled={cancelTransferFromSavingsMutation.isLoading}
                                  >
                                    {cancelTransferFromSavingsMutation.isLoading ? (
                                      <CircleSpinner
                                        loading={cancelTransferFromSavingsMutation.isLoading}
                                        size={18}
                                        color="#dc2626"
                                      />
                                    ) : (
                                      t('transfers_page.cancel_withdraw_from_savings')
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
              <div className="font-semibold">{t('profile.account_history_title')}</div>
              <p
                className="text-xs leading-relaxed text-primary/70"
                data-testid="wallet-account-history-description"
              >
                {t('profile.account_history_description')}
              </p>
              <HistoryTable
                isLoading={operationHistoryLoading}
                historyList={filteredHistoryList}
                historyItemDescription={operationsItemDescription}
                t={t}
              />
            </div>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}

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
      metadata: await getAccountMetadata(username, 'Balances'),
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};
