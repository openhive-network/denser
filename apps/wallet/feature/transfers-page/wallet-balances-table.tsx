'use client';

import dayjs from 'dayjs';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import type { GetDynamicGlobalPropertiesResponse, NaiAsset } from '@hiveio/wax';
import { FullAccount, IFeedHistory, IOpenOrdersData } from '@hive/common-hiveio-packages/wax';
import { Link } from '@hive/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components';
import { TransferDialog, type TransferDialogType } from '@/wallet/components/transfer-dialog';
import { powerdownHive, convertToHP, netDelegatedVests, numberWithCommas, vestsToHive } from '@ui/lib/utils';
import { convertStringToBig, isHive } from '@ui/lib/helpers';
import { createNaiAsset } from '@ui/lib/asset-constants';
import { hiveToHbdSatoshis } from '@ui/lib/asset-math';
import { formatAsset } from '@ui/lib/asset-format';
import { getCurrentHpApr } from '@/wallet/lib/utils';
import RCRow from './rc-row';
import { BalanceAction, BalanceMenu } from './balance-menu';
import { CancelPowerDownDialog } from './cancel-power-down-dialog';

const MIN_HIVE_AMOUNT = '0.001';

interface SuggestedUser {
  username: string;
  about: string;
}

interface WalletBalancesTableProps {
  username: string;
  accountData: FullAccount;
  dynamicData: GetDynamicGlobalPropertiesResponse;
  historyFeedData: IFeedHistory;
  listOfAccounts: SuggestedUser[];
  isOwner: boolean;
  currentUsername?: string;
  blogURL: string;
  openOrders?: IOpenOrdersData[];
}

const WalletBalancesTable = ({
  username,
  accountData,
  dynamicData,
  historyFeedData,
  listOfAccounts,
  isOwner,
  currentUsername,
  blogURL,
  openOrders
}: WalletBalancesTableProps) => {
  const { t } = useTranslation('common_wallet');

  // Calculate balances
  const hours = dayjs(accountData.next_vesting_withdrawal).diff(dayjs(), 'hour');
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const totalTime =
    days === 0
      ? `${remainingHours} ${t('global.time.hours')}`
      : `${days} ${t('global.time.days')} ${remainingHours} ${t('global.time.hours')}`;

  const vestingHiveNai = vestsToHive(
    accountData.vesting_shares,
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );
  const vesting_hive = convertStringToBig(vestingHiveNai);

  const delegated_hive = convertToHP(
    netDelegatedVests(accountData),
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );

  const powerdown_hive = powerdownHive(accountData, dynamicData);
  const isPoweringDown =
    BigInt(accountData.vesting_withdraw_rate.amount) > 0n &&
    BigInt(accountData.to_withdraw) > BigInt(accountData.withdrawn);
  // A small power down's weekly installment can be worth less than the smallest HIVE amount.
  const nextPowerDownHive = powerdown_hive.gte(MIN_HIVE_AMOUNT)
    ? `~${numberWithCommas(powerdown_hive.toFixed(3))}`
    : `< ${MIN_HIVE_AMOUNT}`;
  const received_power_balance =
    (delegated_hive.lt(0) ? '+' : '') + numberWithCommas((-delegated_hive).toFixed(3));

  const saving_balance_hive = convertStringToBig(accountData.savings_balance);
  const hbd_balance = convertStringToBig(accountData.hbd_balance);
  const hbd_balance_savings = convertStringToBig(accountData.savings_hbd_balance);
  const balance_hive = convertStringToBig(accountData.balance);

  const sumForSale = (assetFilter: (order: IOpenOrdersData) => boolean) =>
    (openOrders ?? []).filter(assetFilter).reduce((sum, order) => sum + order.for_sale, 0);

  const hiveOrdersNai = createNaiAsset('HIVE', sumForSale((order) => isHive(order.sell_price.base)));
  const hbdOrdersNai = createNaiAsset('HBD', sumForSale((order) => !isHive(order.sell_price.base)));
  const hiveOrders = convertStringToBig(hiveOrdersNai);
  const hbdOrders = convertStringToBig(hbdOrdersNai);

  const sumSatoshis = (assets: NaiAsset[]) => assets.reduce((sum, asset) => sum + BigInt(asset.amount), BigInt(0));
  const totalHiveSatoshis = sumSatoshis([
    vestingHiveNai,
    accountData.balance,
    accountData.savings_balance,
    hiveOrdersNai
  ]);
  const totalHbdSatoshis = sumSatoshis([accountData.hbd_balance, accountData.savings_hbd_balance, hbdOrdersNai]);
  const { base, quote } = historyFeedData.current_median_history;
  const totalValueHbd = createNaiAsset(
    'HBD',
    hiveToHbdSatoshis(totalHiveSatoshis, BigInt(base.amount), BigInt(quote.amount)) + totalHbdSatoshis
  );

  const total_value = numberWithCommas(convertStringToBig(totalValueHbd).toFixed(2));

  const delegatedVesting = convertToHP(
    accountData.delegated_vesting_shares,
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
      createNaiAsset('VESTS', accountData.to_withdraw),
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive
    ),
    withdraw: convertToHP(
      createNaiAsset('VESTS', accountData.withdrawn),
      dynamicData.total_vesting_shares,
      dynamicData.total_vesting_fund_hive
    )
  };

  const transferAction = (type: TransferDialogType, currency: 'HIVE' | 'HBD', label: string): BalanceAction => ({
    id: type,
    label,
    renderDialog: (dialogProps) => (
      <TransferDialog
        {...dialogProps}
        suggestedUsers={listOfAccounts}
        currency={currency}
        amount={amount}
        type={type}
        username={currentUsername!}
      />
    )
  });

  const hivePowerActions = [
    transferAction('powerDown', 'HIVE', t('profile.power_down')),
    transferAction('delegate', 'HIVE', t('profile.delegate'))
  ];
  if (accountData.to_withdraw !== 0) {
    hivePowerActions.push({
      id: 'cancelPowerDown',
      label: t('profile.cancel_power_down'),
      renderDialog: (dialogProps) => <CancelPowerDownDialog {...dialogProps} username={username} />
    });
  }

  return (
    <>
      <div className="flex max-w-6xl flex-col text-sm">
        <table>
          <tbody>
            <tr className="flex flex-col py-2 sm:table-row">
              <td className="px-2 sm:px-4 sm:py-4">
                <div className="font-semibold">HIVE</div>
                <p className="text-xs leading-relaxed text-primary/70" data-testid="wallet-hive-description">
                  {t('profile.hive_description')}
                </p>
              </td>
              <td className="whitespace-nowrap font-semibold" data-testid="wallet-hive-value">
                {isOwner ? (
                  <BalanceMenu
                    balance={amount.hive}
                    withMarket
                    actions={[
                      transferAction('transfers', 'HIVE', t('profile.transfer')),
                      transferAction('transferTo', 'HIVE', t('profile.transfer_to_savings')),
                      transferAction('powerUp', 'HIVE', t('profile.power_up'))
                    ]}
                  />
                ) : (
                  <div className="px-4 py-2">{amount.hive}</div>
                )}
                {hiveOrders.gt(0) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-4" data-testid="wallet-hive-open-orders">
                          <Link href="/market">(+{formatAsset(hiveOrdersNai)})</Link>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="font-normal">{t('profile.open_orders')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                  {t('profile.hp_description')}{' '}
                  {delegatedVesting.gt(0) ? (
                    <>{t('profile.hp_delegated_description', { username: accountData.name })} </>
                  ) : null}
                  {t('profile.hp_apr_description', { value: getCurrentHpApr(dynamicData).toFixed(2) })}{' '}
                  <span className="font-semibold text-primary hover:text-destructive">
                    <Link href={`${blogURL}/faq.html#How_many_new_tokens_are_generated_by_the_blockchain`}>
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
                  <BalanceMenu balance={hp} actions={hivePowerActions} />
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
                    <TooltipContent className="font-normal">{t('profile.delegated_tooltip')}</TooltipContent>
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
                  <BalanceMenu
                    balance={amount.hbd}
                    withMarket
                    actions={[
                      transferAction('transfers', 'HBD', t('profile.transfer')),
                      transferAction('transferTo', 'HBD', t('profile.transfer_to_savings'))
                    ]}
                  />
                ) : (
                  <div className="px-4 py-2">{amount.hbd}</div>
                )}
                {hbdOrders.gt(0) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-4" data-testid="wallet-hbd-open-orders">
                          <Link href="/market">
                            (+{'$' + formatAsset(hbdOrdersNai, { appendTokenName: false })})
                          </Link>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="font-normal">{t('profile.open_orders')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                    <BalanceMenu
                      balance={amount.savingsHive}
                      actions={[transferAction('withdrawHive', 'HIVE', t('profile.withdraw_hive'))]}
                    />
                    <BalanceMenu
                      balance={amount.savingsHbd}
                      actions={[
                        transferAction('withdrawHiveDollars', 'HBD', t('profile.withdraw_hive_dollars'))
                      ]}
                    />
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
        <RCRow username={username} suggestedUsers={listOfAccounts} />
      </div>
      {isPoweringDown ? (
        <div className="p-2 text-sm sm:p-4">
          {`${t('profile.the_next_power_down')} ${totalTime} (${nextPowerDownHive} HIVE)`}
        </div>
      ) : null}
    </>
  );
};

export default WalletBalancesTable;
