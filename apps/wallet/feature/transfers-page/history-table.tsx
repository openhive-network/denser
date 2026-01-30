import React from 'react';
import { TFunction } from 'i18next';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { Link } from '@hive/ui';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { convertToFormattedHivePower } from '@/wallet/lib/utils';

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

interface HistoryTableProps {
  isLoading: boolean;
  historyList: HiveOperation[] | undefined;
  t: TFunction<'common_wallet', undefined>;
  username: string;
  dynamicData: DynamicData;
}

function formatOperationDescription(
  operation: HiveOperation,
  username: string,
  dynamicData: DynamicData,
  t: TFunction<'common_wallet', undefined>
): React.JSX.Element {
  const hiveChain = hiveChainService.reuseHiveChain();
  if (!hiveChain) return <></>;

  const formattedOperation = hiveChain.formatter.format(operation);
  const opValue = formattedOperation.op.value;

  switch (formattedOperation.op.type) {
    case 'claim_reward_balance_operation': {
      const rewardVests = operation?.op?.value?.reward_vests;
      const formattedHp = convertToFormattedHivePower(
        rewardVests,
        dynamicData.total_vesting_fund_hive,
        dynamicData.total_vesting_shares,
        hiveChain
      );
      return (
        <span>
          {t('profile.claim_rewards')}
          <span>{`${opValue.reward_hbd} ${t('profile.and')}`}</span>
          {` ${opValue.reward_hive} ${t('profile.and')}`}
          {`${formattedHp}`}
        </span>
      );
    }
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
            <Link href={`/@${opValue.from}`} className="font-semibold text-primary hover:text-destructive">
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
      return <div>error</div>;
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
    case 'withdraw_vesting_operation': {
      const formattedHp = convertToFormattedHivePower(
        operation!.op!.value!.reward_vests,
        dynamicData.total_vesting_fund_hive,
        dynamicData.total_vesting_shares,
        hiveChain
      );
      return (
        <span>
          {opValue.amount ? t('profile.start_power_down', formattedHp) : t('profile.stop_power_down')}
        </span>
      );
    }
    default:
      return <div>error</div>;
  }
}

const HistoryTable = ({ t, isLoading, historyList = [], username, dynamicData }: HistoryTableProps) => {
  if (isLoading) return <div>{t('global.loading')}</div>;
  if (historyList.length === 0)
    return (
      <div
        className="py-12 text-center text-3xl text-red-300"
        data-testid="wallet-account-history-no-transacions-found"
      >
        {t('profile.no_transactions_found')}
      </div>
    );

  return (
    <table className="w-full max-w-6xl p-2">
      <tbody>
        {[...historyList].map(
          (element) =>
            element.op && (
              <tr
                key={element.operation_id}
                className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
                data-testid="wallet-account-history-row"
              >
                <td className="px-4 py-2 sm:min-w-[150px]">
                  <TimeAgo date={element.timestamp} />
                </td>
                <td className="px-4 py-2 sm:min-w-[300px]">
                  {formatOperationDescription(element, username, dynamicData, t)}
                </td>
                {element.op.value.memo ? (
                  <td className="hidden break-all px-4 py-2 sm:block">{element.op.value.memo}</td>
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

export default HistoryTable;
