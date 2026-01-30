'use client';

import { useState } from 'react';
import Big from 'big.js';
import dayjs from 'dayjs';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { FullAccount, IFeedHistory, HiveChain } from '@hive/common-hiveio-packages/wax';
import { Link } from '@hive/ui';
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
import { CircleSpinner } from 'react-spinners-kit';
import { TransferDialog } from '@/wallet/components/transfer-dialog';
import { useCancelPowerDownMutation } from '@/wallet/components/hooks/use-power-hive-mutation';
import { handleError } from '@ui/lib/handle-error';
import { toast } from '@ui/components/hooks/use-toast';
import { powerdownHive, convertToHP, numberWithCommas } from '@ui/lib/utils';
import { convertStringToBig } from '@ui/lib/helpers';
import { getCurrentHpApr } from '@/wallet/lib/utils';
import RCRow from './rc-row';

interface SuggestedUser {
  username: string;
  about: string;
}

interface WalletBalancesTableProps {
  username: string;
  accountData: FullAccount;
  dynamicData: GetDynamicGlobalPropertiesResponse;
  historyFeedData: IFeedHistory;
  hiveChain: HiveChain;
  listOfAccounts: SuggestedUser[];
  isOwner: boolean;
  currentUsername?: string;
  blogURL: string;
}

const WalletBalancesTable = ({
  username,
  accountData,
  dynamicData,
  historyFeedData,
  hiveChain,
  listOfAccounts,
  isOwner,
  currentUsername,
  blogURL
}: WalletBalancesTableProps) => {
  const { t } = useTranslation('common_wallet');
  const [open, setOpen] = useState(false);
  const cancelPowerDownMutation = useCancelPowerDownMutation();

  // Calculate balances
  const price_per_hive = Big(
    Number(historyFeedData.current_median_history.base.amount) *
      10 ** -historyFeedData.current_median_history.base.precision
  );

  const hours = dayjs(accountData.next_vesting_withdrawal).diff(dayjs(), 'hour');
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const totalTime =
    days === 0
      ? `${remainingHours} ${t('global.time.hours')}`
      : `${days} ${t('global.time.days')} ${remainingHours} ${t('global.time.hours')}`;

  const vesting_hive = convertToHP(
    convertStringToBig(accountData.vesting_shares),
    hiveChain,
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );

  const delegated_hive = convertToHP(
    convertStringToBig(accountData.delegated_vesting_shares).minus(
      convertStringToBig(accountData.received_vesting_shares)
    ),
    hiveChain,
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );

  const powerdown_hive = powerdownHive(accountData, dynamicData, hiveChain);
  const received_power_balance =
    (delegated_hive.lt(0) ? '+' : '') + numberWithCommas((-delegated_hive).toFixed(3));

  const saving_balance_hive = convertStringToBig(accountData.savings_balance);
  const hbd_balance = convertStringToBig(accountData.hbd_balance);
  const hbd_balance_savings = convertStringToBig(accountData.savings_hbd_balance);
  const balance_hive = convertStringToBig(accountData.balance);

  const savings_hbd_pending = 0;
  const hbdOrders = 0;
  const conversionValue = 0;
  const savings_pending = 0;
  const hiveOrders = 0;

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
    hiveChain,
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );

  const hp = numberWithCommas(vesting_hive.toFixed(3)) + ' HIVE';

  const amount = {
    hive: numberWithCommas(balance_hive.toFixed(3)) + ' HIVE',
    hbd: '$' + numberWithCommas(hbd_balance.toFixed(3)),
    reducedHP: vesting_hive.minus(delegatedVesting).toFixed(3),
    savingsHive: saving_balance_hive.toFixed(3) + ' HIVE',
    savingsHbd: '$' + numberWithCommas(hbd_balance_savings.toFixed(3)),
    delegatedVesting: delegatedVesting,
    to_withdraw: convertToHP(
      Big(accountData.to_withdraw),
      hiveChain,
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive,
      1000000
    ),
    withdraw: convertToHP(
      Big(accountData.withdrawn),
      hiveChain,
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive,
      1000000
    )
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

  return (
    <>
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
                {isOwner ? (
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
                          username={currentUsername!}
                        >
                          {t('profile.transfer')}
                        </TransferDialog>
                        <TransferDialog
                          suggestedUsers={listOfAccounts}
                          currency={'HIVE'}
                          amount={amount}
                          type="transferTo"
                          username={currentUsername!}
                        >
                          {t('profile.transfer_to_savings')}
                        </TransferDialog>
                        <TransferDialog
                          suggestedUsers={listOfAccounts}
                          currency={'HIVE'}
                          amount={amount}
                          type="powerUp"
                          username={currentUsername!}
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
                {isOwner ? (
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
                          username={currentUsername!}
                        >
                          <span>{t('profile.power_down')}</span>
                        </TransferDialog>
                        <TransferDialog
                          suggestedUsers={listOfAccounts}
                          currency={'HIVE'}
                          amount={amount}
                          type="delegate"
                          username={currentUsername!}
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
                {isOwner ? (
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
                          username={currentUsername!}
                        >
                          {t('profile.transfer')}
                        </TransferDialog>
                        <TransferDialog
                          suggestedUsers={listOfAccounts}
                          currency={'HBD'}
                          amount={amount}
                          type="transferTo"
                          username={currentUsername!}
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
                  <Trans
                    i18nKey="profile.savings_description"
                    components={[
                      <Link
                        className="font-semibold text-primary hover:text-destructive"
                        href={`/~witnesses`}
                        key="witnessesLinkText"
                      />
                    ]}
                    values={{
                      rate: (dynamicData.hbd_interest_rate / 100).toFixed(2)
                    }}
                  />
                </p>
              </td>
              <td className="whitespace-nowrap bg-background-secondary font-semibold">
                {isOwner ? (
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
                            username={currentUsername!}
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
                            username={currentUsername!}
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
    </>
  );
};

export default WalletBalancesTable;
