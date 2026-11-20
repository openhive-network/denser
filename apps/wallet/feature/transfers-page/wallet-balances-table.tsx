'use client';

import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useTranslation, Trans } from '@/wallet/i18n/client';
import type { GetDynamicGlobalPropertiesResponse, NaiAsset } from '@hiveio/wax';
import { FullAccount, IFeedHistory, IOpenOrdersData } from '@hive/common-hiveio-packages/wax';
import { Link } from '@hive/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components';
import type { TransferDialogType } from '@/wallet/components/transfer-dialog';
import { powerdownHive, convertToHP, netDelegatedVests, vestsToHive } from '@ui/lib/utils';
import { useLocale } from '@ui/components/locale-context';
import { formatAmount, formatDollars, formatDuration, formatNumber } from '@ui/lib/locale-format';
import Big from 'big.js';
import { convertStringToBig, isHive } from '@ui/lib/helpers';
import { createNaiAsset } from '@ui/lib/asset-constants';
import { hiveToHbdSatoshis } from '@ui/lib/asset-math';
import { formatAsset } from '@ui/lib/asset-format';
import { getCurrentHpApr } from '@/wallet/lib/utils';
import RCRow from './rc-row';
import { BalanceAction, BalanceMenu } from './balance-menu';
import { CancelPowerDownDialog } from './cancel-power-down-dialog';

// BalanceMenu renders a dialog only once its action is picked, so the transfer form, its memo
// checks and the memo encryption load then, not with the page.
const TransferDialog = dynamic(
  () => import('@/wallet/components/transfer-dialog').then((m) => m.TransferDialog),
  { ssr: false }
);

const MIN_HIVE_AMOUNT = '0.001';
const HIVE_DECIMALS = 3;

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
  const { locale } = useLocale();

  // Calculate balances
  const hours = dayjs(accountData.next_vesting_withdrawal).diff(dayjs(), 'hour');
  // The sentence puts the duration after "in" (pl "za", ru "через"), which takes the accusative.
  const totalTime = formatDuration({ day: Math.floor(hours / 24), hour: hours % 24 }, locale, 'accusative');

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
    ? `~${formatNumber(powerdown_hive, locale, HIVE_DECIMALS)}`
    : `< ${formatNumber(Big(MIN_HIVE_AMOUNT), locale, HIVE_DECIMALS)}`;
  const hasReceivedPower = !delegated_hive.round(HIVE_DECIMALS).eq(0);
  const received_power_balance =
    (delegated_hive.lt(0) ? '+' : '') + formatNumber(delegated_hive.neg(), locale, HIVE_DECIMALS);

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

  const total_value = formatDollars(convertStringToBig(totalValueHbd), locale);

  const delegatedVesting = convertToHP(
    accountData.delegated_vesting_shares,
    dynamicData.total_vesting_shares,
    dynamicData.total_vesting_fund_hive
  );

  const hp = formatAmount(vesting_hive, 'HIVE', locale);
  const balances = {
    hive: formatAmount(balance_hive, 'HIVE', locale),
    hbd: formatDollars(hbd_balance, locale, HIVE_DECIMALS),
    savingsHive: formatAmount(saving_balance_hive, 'HIVE', locale),
    savingsHbd: formatDollars(hbd_balance_savings, locale, HIVE_DECIMALS)
  };

  const amount = {
    hive: balance_hive,
    hbd: hbd_balance,
    reducedHP: vesting_hive.minus(delegatedVesting).round(HIVE_DECIMALS),
    savingsHive: saving_balance_hive,
    savingsHbd: hbd_balance_savings,
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
                    balance={balances.hive}
                    withMarket
                    actions={[
                      transferAction('transfers', 'HIVE', t('profile.transfer')),
                      transferAction('transferTo', 'HIVE', t('profile.transfer_to_savings')),
                      transferAction('powerUp', 'HIVE', t('profile.power_up'))
                    ]}
                  />
                ) : (
                  <div className="px-4 py-2">{balances.hive}</div>
                )}
                {hiveOrders.gt(0) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-4" data-testid="wallet-hive-open-orders">
                          <Link href="/market">(+{formatAsset(hiveOrdersNai, { locale })})</Link>
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
                  {t('profile.hp_apr_description', { value: formatNumber(getCurrentHpApr(dynamicData), locale, 2) })}{' '}
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
                      {hasReceivedPower && (
                        <div className="px-4">({received_power_balance} HIVE)</div>
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
                    balance={balances.hbd}
                    withMarket
                    actions={[
                      transferAction('transfers', 'HBD', t('profile.transfer')),
                      transferAction('transferTo', 'HBD', t('profile.transfer_to_savings'))
                    ]}
                  />
                ) : (
                  <div className="px-4 py-2">{balances.hbd}</div>
                )}
                {hbdOrders.gt(0) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-4" data-testid="wallet-hbd-open-orders">
                          <Link href="/market">
                            (+{formatDollars(hbdOrders, locale, HIVE_DECIMALS)})
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
                      rate: formatNumber(dynamicData.hbd_interest_rate / 100, locale, 2)
                    }}
                  />
                </p>
              </td>
              <td className="whitespace-nowrap bg-background-secondary font-semibold">
                {isOwner ? (
                  <div className="flex w-fit flex-col items-start">
                    <BalanceMenu
                      balance={balances.savingsHive}
                      actions={[transferAction('withdrawHive', 'HIVE', t('profile.withdraw_hive'))]}
                    />
                    <BalanceMenu
                      balance={balances.savingsHbd}
                      actions={[
                        transferAction('withdrawHiveDollars', 'HBD', t('profile.withdraw_hive_dollars'))
                      ]}
                    />
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <div data-testid="wallet-saving-hive-value">{balances.savingsHive}</div>
                    <div data-testid="walled-hbd-saving-value">{balances.savingsHbd}</div>
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
                {total_value}
              </td>
            </tr>
          </tbody>
        </table>
        <RCRow username={username} suggestedUsers={listOfAccounts} />
      </div>
      {isPoweringDown ? (
        <div className="p-2 text-sm sm:p-4">
          {t('profile.the_next_power_down', { time: totalTime, amount: nextPowerDownHive })}
        </div>
      ) : null}
    </>
  );
};

export default WalletBalancesTable;
