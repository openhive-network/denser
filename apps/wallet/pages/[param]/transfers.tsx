import { useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import {
  getAccount,
  getDynamicGlobalProperties,
  getFeedHistory
} from '@hive/ui/lib/hive';
import moment from 'moment';
import clsx from 'clsx';
import { getAccountHistory } from '@/wallet/lib/hive';
import { getCurrentHpApr } from '@/wallet/lib/utils';
import { delegatedHive, vestingHive, powerdownHive } from '@hive/ui/lib/utils';
import { numberWithCommas } from '@hive/ui/lib/utils';
import { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { AccountHistory } from '@/wallet/store/app-types';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import Loading from '@hive/ui/components/loading';
import TransfersHistoryFilter, {
  TransferFilters
} from '@/wallet/components/transfers-history-filter';
import { useState } from 'react';
import { useRouter } from 'next/router';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/wallet/next-i18next.config';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';

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
  const operation: Operation | undefined = !op
    ? undefined
    : op[0] === 'transfer'
      ? {
        type: 'transfer',
        amount: op[1].amount,
        from: op[1].from,
        memo: op[1].memo,
        to: op[1].to
      }
      : op[0] === 'claim_reward_balance'
        ? {
          type: 'claim_reward_balance',
          account: op[1].account,
          reward_hbd: convertStringToBig(op[1]?.reward_hbd ?? '0'),
          reward_hive: convertStringToBig(op[1]?.reward_hive ?? '0'),
          reward_vests: convertStringToBig(op[1]?.reward_vests ?? '0')
        }
        : op[0] === 'transfer_from_savings'
          ? {
            type: 'transfer_from_savings',
            amount: op[1].amount,
            from: op[1].from,
            request_id: op[1].request_id,
            memo: op[1].memo,
            to: op[1].to
          }
          : op[0] === 'transfer_to_savings'
            ? {
              type: 'transfer_to_savings',
              amount: op[1].amount,
              from: op[1].from,
              memo: op[1].memo,
              to: op[1].to
            }
            : op[0] === 'transfer_to_vesting'
              ? {
                type: 'transfer_to_vesting',
                amount: op[1].amount,
                from: op[1].from,
                to: op[1].to
              }
              : op[0] === 'interest'
                ? {
                  type: 'interest',
                  interest: op[1].interest,
                  is_saved_into_hbd_balance: op[1].is_saved_into_hbd_balance,
                  owner: op[1].owner
                }
                : op[0] === 'cancel_transfer_from_savings'
                  ? {
                    type: 'cancel_transfer_from_savings',
                    from: op[1].from,
                    request_id: op[1].request_id
                  }
                  : op[0] === 'fill_order'
                    ? {
                      type: 'fill_order',
                      current_pays: op[1].current_pays,
                      open_pays: op[1].open_pays
                    }
                    : undefined;

  return { id, ...rest, operation };
};

const useFilters = (initialFilters: TransferFilters) => {
  const [rawfilter, setFilter] = useState<TransferFilters>(initialFilters);
  const noFilters =
    !rawfilter.incoming && !rawfilter.outcoming && !rawfilter.others;

  const filter: TransferFilters = {
    ...rawfilter,
    incoming: rawfilter.incoming || noFilters,
    outcoming: rawfilter.outcoming || noFilters,
    others: !rawfilter.search && (rawfilter.others || noFilters)
  };

  return [rawfilter, filter, setFilter] as const;
};

type AccountHistoryData = ReturnType<typeof mapToAccountHistoryObject>;

function TransfersPage({
                         username
                       }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation('common_wallet');
  const router = useRouter();
  const [rawFilter, filter, setFilter] = useFilters(initialFilters);

  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError
  } = useQuery(['accountData', username], () => getAccount(username), {
    enabled: Boolean(username)
  });
  const {
    data: dynamicData,
    isSuccess: dynamicSuccess,
    isLoading: dynamicLoading,
    isError: dynamicError
  } = useQuery(['dynamicGlobalProperties'], () => getDynamicGlobalProperties());
  const {
    data: accountHistoryData,
    isLoading: accountHistoryLoading,
    isError: accountHistoryError
  } = useQuery(
    ['accountHistory', username],
    () => getAccountHistory(username, -1, 500),
    {
      select: (data) => data.map(mapToAccountHistoryObject)
    }
  );
  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());
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
  const price_per_hive = convertStringToBig(
    historyFeedData.current_median_history.base
  );

  const totalDays = moment(accountData.next_vesting_withdrawal).diff(
    moment(),
    `d`
  );

  const totalShares = convertStringToBig(dynamicData.total_vesting_shares);
  const vesting_hive = vestingHive(accountData, dynamicData);
  const delegated_hive = delegatedHive(accountData, dynamicData);
  const powerdown_hive = powerdownHive(accountData, dynamicData);
  const received_power_balance =
    (delegated_hive.lt(0) ? '+' : '') +
    numberWithCommas((-delegated_hive).toFixed(3));
  const saving_balance_hive = convertStringToBig(accountData.savings_balance);
  const hbd_balance = convertStringToBig(accountData.hbd_balance);
  const hbd_balance_savings = convertStringToBig(
    accountData.savings_hbd_balance
  );
  const balance_hive = convertStringToBig(accountData.balance);
  const savings_hbd_pending = 0; //NEED TO LOGIN
  const hbdOrders = 0; //NEED TO LOGIN
  const conversionValue = 0; //NEED TO LOGIN
  const savings_pending = 0; //NEED TO LOGIN
  const hiveOrders = 0; //NEED TO LOGIN
  //estimated account value, no correct
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
  const total_value = numberWithCommas(
    total_hive.times(Big(price_per_hive)).plus(total_hbd).toFixed(2)
  );

  const filteredHistoryList = accountHistoryData?.filter(
    getFilter({ filter, totalFund, username, totalShares })
  );

  function historyItemDescription(operation: Operation) {
    if (operation.type === 'claim_reward_balance') {
      const powerHP = totalFund.times(operation.reward_vests.div(totalShares));
      const displayHBD = operation.reward_hbd.gt(0);
      const displayHIVE = operation.reward_hive.gt(0);

      return (
        <span>
          {t('profil.claim_rewards')}
          {displayHBD && (
            <span>
              {operation.reward_hbd.toString() +
                ' HBD ' +
                (displayHIVE ? ',' :  t('profil.and'))}
            </span>
          )}
          {displayHIVE && (
            <span>{operation.reward_hive.toString() + ' HIVE' +  t('profil.and')}</span>
          )}
          {powerHP.toFixed(3)}
          {' HIVE POWER'}
        </span>
      );
    }
    if (operation.type === 'transfer') {
      if (operation.to === username)
        return (
          <span>
            {t('profil.received_from_user', {value: operation.amount?.toString()})}
            <Link
              href={`/@${operation.from}`}
              className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'
            >
              {operation.from}
            </Link>
          </span>
        );
      if (operation.from === username)
        return (
          <span>
          {t('profil.transfer_to_user', {value: operation.amount?.toString()})}
            <Link
              href={`/@${operation.to}`}
              className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'
            >
              {operation.to}
            </Link>
          </span>
        );
    }
    if (operation.type === 'transfer_from_savings') {
      return (
        <span>
          {t('profil.transfer_from_savings_to', {value: operation.amount?.toString()})}
          <Link
            href={`/@${operation.to}`}
            className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'
          >
            {operation.to}
          </Link>
          {t('profil.request_id', {value: operation.request_id})}
        </span>
      );
    }
    if (operation.type === 'transfer_to_savings') {
      return (
        <span>
          {t('profil.transfer_to_savings_to', {value: operation.amount?.toString()})}
          <Link
            href={`/@${operation.to}`}
            className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'
          >
            {operation.to}
          </Link>
        </span>
      );
    }
    if (operation.type === 'transfer_to_vesting') {
      return (
        <span>
          {t('profil.transfer_to', {value: operation.amount?.toString()})}
          <Link
            href={`/@${operation.to}`}
            className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'
          >
            {operation.to}
          </Link>
        </span>
      );
    }
    if (operation.type === 'interest') {
      return (
        <span>
          {t('profil.cancel_transfer_from_savings', {number: operation.interest})}
        </span>
      );
    }
    if (operation.type === 'cancel_transfer_from_savings') {
      return (
        <span>
        {t('profil.cancel_transfer_from_savings', {number: operation.request_id})}
        </span>
      );
    }
    if (operation.type === 'fill_order') {
      return (
        <span>
          {t('profil.paid_for', {value1: operation.current_pays, value2: operation.open_pays})}
        </span>
      );
    } else return <div>error</div>;
  }

  return (
    <ProfileLayout>
      <div className='flex flex-col w-full items-center '>
        <div className='flex gap-6 border-b-2 border-zinc-500 px-4 py-2 w-full max-w-6xl'>
          <Link
            href={`/@${username}/transfers`}
            className={clsx(
              router.asPath === `/@${username}/transfers`
                ? 'dark:text-slate-100 text-slate-700 font-semibold'
                : 'hover:text-red-600 dark:hover:text-red-400'
            )}
            data-testid="wallet-balances-link"
          >
            {t('navigation.wallet_nav.balances')}
          </Link>
          <Link href={`/@${username}/delegations`}>
            <div className='hover:text-red-600 dark:hover:text-red-400' data-testid="wallet-delegations-link">
            {t('navigation.wallet_nav.delegations')}
            </div>
          </Link>
        </div>

        <table className='max-w-6xl table-auto text-sm'>
          <tbody>
          <tr>
            <td className='px-2 py-4 sm:px-4'>
              <div className='font-semibold'>HIVE</div>
              <p className='text-xs text-zinc-600 py-2 sm:pb-0 leading-relaxed' data-testid="wallet-hive-description">
              {t('profil.hive_description')}
              </p>
              <div className='sm:hidden'>
                {numberWithCommas(balance_hive.toFixed(3)) + ' HIVE'}
              </div>
            </td>
            <td className='font-semibold whitespace-nowrap hidden sm:block p-4' data-testid="wallet-hive-value">
              {numberWithCommas(balance_hive.toFixed(3)) + ' HIVE'}
            </td>
          </tr>

          <tr className='bg-slate-100 dark:bg-slate-900'>
            <td className='px-2 py-4 sm:px-4'>
              <div className='font-semibold'>HIVE POWER</div>
              <p className='text-xs text-zinc-600 py-2 sm:pb-0 leading-relaxed' data-testid="wallet-hive-power-description">
              {t('profil.hp_description',
              {username:accountData.name, value:getCurrentHpApr(dynamicData).toFixed(2)})}
               {' '}
                <span
                  className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'>
                    <Link href='https://hive.blog/faq.html#How_many_new_tokens_are_generated_by_the_blockchain'>
                      {t('profil.see_faq_for_details')}
                    </Link>
                  </span>
              </p>
              <div className='sm:hidden'>
                <div>
                  {numberWithCommas(vesting_hive.toFixed(3)) + ' HIVE'}
                </div>
                <div>({received_power_balance + ' HIVE'})</div>
              </div>
            </td>
            <td className='font-semibold whitespace-nowrap hidden sm:block p-4 bg-slate-100 dark:bg-slate-900' data-testid="wallet-hive-power">
              <div>{numberWithCommas(vesting_hive.toFixed(3)) + ' HIVE'}</div>
              <div>({received_power_balance + ' HIVE'})</div>
            </td>
          </tr>

          <tr>
            <td className='px-2 py-4 sm:px-4'>
              <div className='font-semibold'>HIVE DOLLARS</div>
              <p className='text-xs text-zinc-600 py-2 sm:pb-0 leading-relaxed' data-testid="wallet-hive-dollars-description">
                {t('profil.hive_dolar_description')}
              </p>
              <div className='sm:hidden'>
                {'$' + numberWithCommas(hbd_balance.toFixed(3))}
              </div>
            </td>
            <td className='font-semibold whitespace-nowrap hidden sm:block p-4 ' data-testid="wallet-hive-dallars-value">
              {'$' + numberWithCommas(hbd_balance.toFixed(3))}
            </td>
          </tr>

          <tr className=' bg-slate-100 dark:bg-slate-900'>
            <td className='px-2 py-4 sm:px-4'>
              <div className='font-semibold'>{t('profil.savings_title')}</div>
              <p className='text-xs text-zinc-600 py-2 sm:pb-0 leading-relaxed' data-testid="wallet-savings-description">
              {t('profil.savings_description')}
                <span
                  className='font-semibold text-zinc-900 hover:text-red-600 dark:text-zinc-100 dark:hover:text-red-400'>
                    {<Link href={`/~witnesses`}>{t('profil.witnesses')}</Link>}
                  </span>
               {")"}
              </p>
              <div className='sm:hidden'>
                <div>{saving_balance_hive.toFixed(3) + ' HIVE'}</div>
                {' '}
                <div>
                  {numberWithCommas('$' + hbd_balance_savings.toFixed(3))}
                </div>
              </div>
            </td>
            <td className='font-semibold whitespace-nowrap hidden sm:block p-4 bg-slate-100 dark:bg-slate-900'>
              <div data-testid="wallet-saving-hive-value">{saving_balance_hive.toFixed(3) + ' HIVE'}</div>
              <div data-testid="walled-hbd-saving-value">
                {numberWithCommas('$' + hbd_balance_savings.toFixed(3))}
              </div>
            </td>
          </tr>

          <tr>
            <td className='px-2 py-4 sm:px-4'>
              <div className='font-semibold'>{t('profil.estimated_account_value_title')}</div>
              <p className='text-xs text-zinc-600 py-2 sm:pb-0 leading-relaxed' data-testid="wallet-estimated-account-value-description">
              {t('profil.estimated_account_value_description')}
              </p>
              <div className='sm:hidden'>{'$' + total_value}</div>
            </td>
            <td className='font-semibold whitespace-nowrap hidden sm:block p-4' data-testid="wallet-estimated-account-value">
              {'$' + total_value}
            </td>
          </tr>
          </tbody>
        </table>
        {powerdown_hive.gt(0) ? (
          <div className='p-2 sm:p-4 text-sm'>
            {t('profil.the_next_power_down')} {totalDays}{' '}
            {totalDays !== 1 ? ' days' : 'day'}(~
            {numberWithCommas(powerdown_hive.toFixed(3))} HIVE)
          </div>
        ) : null}
        <div className='w-full max-w-6xl'>
          <TransfersHistoryFilter
            onFiltersChange={(value) => {
              setFilter((prevFilters) => ({
                ...prevFilters,
                ...value
              }));
            }}
            value={rawFilter}
          />
          <div className='p-2 sm:p-4'>
            <div className='font-semibold'>{t('profil.account_history_title')}</div>
            <p className='text-xs text-zinc-600 leading-relaxed' data-testid="wallet-account-history-description">
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
  t: TFunction<'common_wallet', undefined>
}

const HistoryTable = ({
  t,
  isLoading,
  historyList = [],
  historyItemDescription
}: HistoryTableProps) => {
  if (isLoading) return <div>{t('global.loading')}</div>;
  if (historyList.length === 0)
    return (
      <div className='text-red-300 text-3xl py-12 text-center' data-testid="wallet-account-history-no-transacions-found">
        {t('profil.no_transactions_found')}
      </div>
    );

  return (
    <table className='p-2 w-full max-w-6xl'>
      <tbody>
      {[...historyList].reverse().map((element) =>
        !element.operation ? null : (
          <tr
            key={element.id}
            className='m-0 p-0 text-xs even:bg-slate-100 dark:even:bg-slate-700 sm:text-sm w-full'
            data-testid="wallet-account-history-row"
          >
            <td className='px-4 py-2 sm:min-w-[150px]'>
              {dateToFullRelative(element.timestamp, t)}
            </td>
            <td className='px-4 py-2 sm:min-w-[300px]'>
              {historyItemDescription(element.operation)}
            </td>
            {element.operation.memo ? (
              <td className='break-all px-4 py-2 hidden sm:block'>
                {element.operation.memo}
              </td>
            ) : <td></td>}
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
      ...(await serverSideTranslations(ctx.req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_wallet']))
    }
  };
};

interface getFilterArgs {
  filter: TransferFilters;
  totalFund: Big;
  totalShares: Big;
  username: string;
}

const getFilter =
  ({ filter, totalFund, username, totalShares }: getFilterArgs) =>
    ({ operation }: AccountHistoryData) => {
      if (!operation) return false;
      switch (operation.type) {
        case 'transfer':
          const opAmount = convertStringToBig(operation.amount ?? '0');
          const incomingFromCurrent =
            operation.to === username || operation.from !== username;
          const outcomingFromCurrent =
            operation.from === username || operation.to !== username;
          const inSearch =
            operation.to?.includes(filter.search) ||
            operation.from?.includes(filter.search);

          return (
            !(filter.exlude && opAmount.lt(1)) &&
            (filter.incoming || !incomingFromCurrent) &&
            (filter.outcoming || !outcomingFromCurrent) &&
            inSearch
          );
        case 'claim_reward_balance':
          if (
            !filter.others ||
            (filter.exlude &&
              operation.reward_hbd.lt(1) &&
              operation.reward_hive.lt(1) &&
              totalFund.times(operation.reward_vests.div(totalShares)).lt(1))
          )
            return false;
          break;

        case 'transfer_from_savings':
        case 'transfer_to_savings':
        case 'transfer_to_vesting':
          if (
            !filter.others ||
            (filter.exlude && convertStringToBig(operation?.amount || '0').lt(1))
          )
            return false;
          break;
        case 'interest':
          if (
            !filter.others ||
            (filter.exlude &&
              convertStringToBig(operation?.interest || '0').lt(1))
          )
            return false;
          break;
        case 'fill_order':
          if (
            !filter.others ||
            (filter.exlude &&
              convertStringToBig(operation?.open_pays || '0').lt(1) &&
              convertStringToBig(operation?.current_pays || '0').lt(1))
          )
            return false;
          break;

        case 'cancel_transfer_from_savings':
          if (!filter.others || filter.exlude) return false;
      }
      return true;
    };
