import type { ReactNode } from 'react';
import type {
  GetDynamicGlobalPropertiesResponse,
  claim_reward_balance,
  transfer,
  transfer_from_savings,
  transfer_to_savings,
  transfer_to_vesting,
  interest,
  cancel_transfer_from_savings,
  fill_order,
  withdraw_vesting,
  author_reward,
  recurrent_transfer,
  fill_recurrent_transfer,
  failed_recurrent_transfer
} from '@hiveio/wax';
import type { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { TFunction } from 'i18next';
import { Link } from '@hive/ui';
import { formatOptionalAsset } from '@ui/lib/asset-format';
import { convertToFormattedHivePower } from '@/wallet/lib/utils';

type DynamicData = Pick<GetDynamicGlobalPropertiesResponse, 'total_vesting_fund_hive' | 'total_vesting_shares'>;

interface IFormattedOperationValues {
  claim_reward_balance_operation: claim_reward_balance;
  transfer_from_savings_operation: transfer_from_savings;
  transfer_operation: transfer;
  transfer_to_savings_operation: transfer_to_savings;
  transfer_to_vesting_operation: transfer_to_vesting;
  interest_operation: interest;
  cancel_transfer_from_savings_operation: cancel_transfer_from_savings;
  fill_order_operation: fill_order;
  withdraw_vesting_operation: withdraw_vesting;
  recurrent_transfer_operation: recurrent_transfer;
  fill_recurrent_transfer_operation: fill_recurrent_transfer;
  failed_recurrent_transfer_operation: failed_recurrent_transfer;
  author_reward_operation: author_reward;
}

type OperationRenderers = {
  [Type in keyof IFormattedOperationValues]: (op: IFormattedOperationValues[Type]) => ReactNode;
};

const UNFORMATTED_OPERATION = <div>error</div>;

const AccountLink = ({ name, children }: { name: string; children?: ReactNode }) => (
  <Link href={`/@${name}`} className="font-semibold text-primary hover:text-destructive">
    {children ?? name}
  </Link>
);

/**
 * Renders the description of an account history operation in plain TypeScript, without wax:
 * assets as wax's `formatter.format` writes them (`formatOptionalAsset`) and vesting shares as
 * Hive Power at the given vesting totals. Operation types without a description, and transfers the
 * account is not a party to, render `error`.
 */
export function createWalletOperationsFormatter(
  username: string,
  dynamicData: DynamicData,
  t: TFunction<'common_wallet', undefined>
): (operation: HiveOperation) => ReactNode {
  const formatHivePower = (vests: IFormattedOperationValues['withdraw_vesting_operation']['vesting_shares']) =>
    convertToFormattedHivePower(vests, dynamicData.total_vesting_fund_hive, dynamicData.total_vesting_shares);

  const renderers: OperationRenderers = {
    claim_reward_balance_operation: (op) => (
      <span>
        {t('profile.claim_rewards')}
        <span>{`${formatOptionalAsset(op.reward_hbd)} ${t('profile.and')}`}</span>
        {` ${formatOptionalAsset(op.reward_hive)} ${t('profile.and')}`}
        {`${formatHivePower(op.reward_vests)}`}
      </span>
    ),
    transfer_from_savings_operation: (op) => (
      <span>
        {t('profile.transfer_from_savings_to', { value: formatOptionalAsset(op.amount) })}
        <AccountLink name={op.to}>{`${op.to} `}</AccountLink>
        {t('profile.request_id', { value: op.request_id })}
      </span>
    ),
    transfer_operation: (op) => {
      if (op.to === username)
        return (
          <span>
            {t('profile.received_from_user', { value: formatOptionalAsset(op.amount) })}
            <AccountLink name={op.from} />
          </span>
        );
      if (op.from === username)
        return (
          <span>
            {t('profile.transfer_to_user', { value: formatOptionalAsset(op.amount) })}
            <AccountLink name={op.to} />
          </span>
        );
      return UNFORMATTED_OPERATION;
    },
    transfer_to_savings_operation: (op) => (
      <span>
        {t('profile.transfer_to_savings_to', { value: formatOptionalAsset(op.amount) })}
        <AccountLink name={op.to} />
      </span>
    ),
    transfer_to_vesting_operation: (op) =>
      op.from === username ? (
        <span>
          {t('profile.transfer_hp_to', { value: formatOptionalAsset(op.amount) })}
          <AccountLink name={op.to} />
        </span>
      ) : (
        <span>
          {t('profile.transfer_hp_from', { value: formatOptionalAsset(op.amount) })}
          <AccountLink name={op.from} />
        </span>
      ),
    interest_operation: (op) => (
      <span>{t('profile.receive_interest', { number: formatOptionalAsset(op.interest) })}</span>
    ),
    cancel_transfer_from_savings_operation: (op) => (
      <span>{t('profile.cancel_transfer_from_savings', { number: op.request_id })}</span>
    ),
    fill_order_operation: (op) => (
      <span>
        {t('profile.paid_for', {
          value1: formatOptionalAsset(op.current_pays),
          value2: formatOptionalAsset(op.open_pays)
        })}
      </span>
    ),
    withdraw_vesting_operation: (op) => {
      const hasAmount = op.vesting_shares && BigInt(op.vesting_shares.amount) > 0n;
      return (
        <span>
          {hasAmount
            ? t('profile.start_power_down', { amount: formatHivePower(op.vesting_shares) })
            : t('profile.stop_power_down')}
        </span>
      );
    },
    recurrent_transfer_operation: (op) => {
      // amount 0 cancels the recurring transfer agreement
      const cancelled = !op.amount || BigInt(op.amount.amount) === 0n;
      const outgoing = op.from === username;
      const other = outgoing ? op.to : op.from;
      const key = cancelled
        ? outgoing
          ? 'profile.recurrent_transfer_cancel_to'
          : 'profile.recurrent_transfer_cancel_from'
        : outgoing
          ? 'profile.recurrent_transfer_to'
          : 'profile.recurrent_transfer_from';
      return (
        <span>
          {t(key, {
            value: formatOptionalAsset(op.amount),
            recurrence: op.recurrence,
            executions: op.executions
          })}
          <AccountLink name={other} />
        </span>
      );
    },
    fill_recurrent_transfer_operation: (op) => {
      const outgoing = op.from === username;
      const other = outgoing ? op.to : op.from;
      return (
        <span>
          {t(outgoing ? 'profile.fill_recurrent_transfer_to' : 'profile.fill_recurrent_transfer_from', {
            value: formatOptionalAsset(op.amount),
            remaining: op.remaining_executions
          })}
          <AccountLink name={other} />
        </span>
      );
    },
    failed_recurrent_transfer_operation: (op) => {
      const outgoing = op.from === username;
      const other = outgoing ? op.to : op.from;
      return (
        <span className="text-destructive">
          {t(outgoing ? 'profile.failed_recurrent_transfer_to' : 'profile.failed_recurrent_transfer_from', {
            value: formatOptionalAsset(op.amount),
            failures: op.consecutive_failures
          })}
          <AccountLink name={other} />
          {op.deleted ? t('profile.recurrent_transfer_deleted') : ''}
        </span>
      );
    },
    author_reward_operation: (op) => (
      <span>
        {t('profile.author_reward', {
          hbd: formatOptionalAsset(op.hbd_payout),
          hive: formatOptionalAsset(op.hive_payout),
          hp: formatHivePower(op.vesting_payout)
        })}
      </span>
    )
  };

  const isFormattedType = (type: string): type is keyof IFormattedOperationValues =>
    Object.prototype.hasOwnProperty.call(renderers, type);

  return ({ op }: HiveOperation): ReactNode => {
    if (!isFormattedType(op.type)) return UNFORMATTED_OPERATION;
    // The API's operation value is the protocol shape of its type, which the dispatch key names.
    const render = renderers[op.type] as (value: unknown) => ReactNode;
    return render(op.value);
  };
}
