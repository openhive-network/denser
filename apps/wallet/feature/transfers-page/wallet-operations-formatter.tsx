import {
  WaxFormattable,
  IWaxCustomFormatter,
  IFormatFunctionArguments,
  IWaxBaseInterface,
  GetDynamicGlobalPropertiesResponse,
  NaiAsset,
  type claim_reward_balance,
  type transfer,
  type transfer_from_savings,
  type transfer_to_savings,
  type transfer_to_vesting,
  type interest,
  type cancel_transfer_from_savings,
  type fill_order,
  type withdraw_vesting,
  type author_reward,
  type recurrent_transfer,
  type fill_recurrent_transfer,
  type failed_recurrent_transfer,
} from '@hiveio/wax';
import { TFunction } from 'i18next';
import { Link } from '@hive/ui';
import { convertToFormattedHivePower } from '@/wallet/lib/utils';
import { HiveChain } from '@transaction/lib/hive-chain-service';

type DynamicData = Pick<
  GetDynamicGlobalPropertiesResponse,
  'total_vesting_fund_hive' | 'total_vesting_shares'
>;

export function createWalletOperationsFormatter(
  username: string,
  dynamicData: DynamicData,
  t: TFunction<'common_wallet', undefined>,
  hiveChain: HiveChain
) {
  class WalletOperationsFormatter implements IWaxCustomFormatter {
    constructor(private readonly wax: IWaxBaseInterface) {}

    private formatAsset(value: unknown): string {
      if (!value) return '';
      return this.wax.formatter.format(value) as string;
    }

    private getFormattedHivePower(vests: unknown): string {
      return convertToFormattedHivePower(
        vests as NaiAsset | undefined,
        dynamicData.total_vesting_fund_hive,
        dynamicData.total_vesting_shares,
        hiveChain
      );
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'claim_reward_balance_operation' })
    formatClaimRewardBalance({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: claim_reward_balance }>) {
      const formattedHp = this.getFormattedHivePower(op.reward_vests);
      return {
        ...target,
        value: (
          <span>
            {t('profile.claim_rewards')}
            <span>{`${this.formatAsset(op.reward_hbd)} ${t('profile.and')}`}</span>
            {` ${this.formatAsset(op.reward_hive)} ${t('profile.and')}`}
            {`${formattedHp}`}
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'transfer_from_savings_operation' })
    formatTransferFromSavings({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: transfer_from_savings }>) {
      return {
        ...target,
        value: (
          <span>
            {t('profile.transfer_from_savings_to', { value: this.formatAsset(op.amount) })}
            <Link href={`/@${op.to}`} className="font-semibold text-primary hover:text-destructive">
              {`${op.to} `}
            </Link>
            {t('profile.request_id', { value: op.request_id })}
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'transfer_operation' })
    formatTransfer({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: transfer }>) {
      if (op.to === username) {
        return {
          ...target,
          value: (
            <span>
              {t('profile.received_from_user', { value: this.formatAsset(op.amount) })}
              <Link href={`/@${op.from}`} className="font-semibold text-primary hover:text-destructive">
                {op.from}
              </Link>
            </span>
          ),
        };
      }
      if (op.from === username) {
        return {
          ...target,
          value: (
            <span>
              {t('profile.transfer_to_user', { value: this.formatAsset(op.amount) })}
              <Link href={`/@${op.to}`} className="font-semibold text-primary hover:text-destructive">
                {op.to}
              </Link>
            </span>
          ),
        };
      }
      return { ...target, value: <div>error</div> };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'transfer_to_savings_operation' })
    formatTransferToSavings({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: transfer_to_savings }>) {
      return {
        ...target,
        value: (
          <span>
            {t('profile.transfer_to_savings_to', { value: this.formatAsset(op.amount) })}
            <Link href={`/@${op.to}`} className="font-semibold text-primary hover:text-destructive">
              {op.to}
            </Link>
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'transfer_to_vesting_operation' })
    formatTransferToVesting({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: transfer_to_vesting }>) {
      if (op.from === username) {
        return {
          ...target,
          value: (
            <span>
              {t('profile.transfer_hp_to', { value: this.formatAsset(op.amount) })}
              <Link href={`/@${op.to}`} className="font-semibold text-primary hover:text-destructive">
                {op.to}
              </Link>
            </span>
          ),
        };
      }
      return {
        ...target,
        value: (
          <span>
            {t('profile.transfer_hp_from', { value: this.formatAsset(op.amount) })}
            <Link href={`/@${op.from}`} className="font-semibold text-primary hover:text-destructive">
              {op.from}
            </Link>
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'interest_operation' })
    formatInterest({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: interest }>) {
      return {
        ...target,
        value: (
          <span>{t('profile.receive_interest', { number: this.formatAsset(op.interest) })}</span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'cancel_transfer_from_savings_operation' })
    formatCancelTransferFromSavings({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: cancel_transfer_from_savings }>) {
      return {
        ...target,
        value: <span>{t('profile.cancel_transfer_from_savings', { number: op.request_id })}</span>,
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'fill_order_operation' })
    formatFillOrder({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: fill_order }>) {
      return {
        ...target,
        value: (
          <span>
            {t('profile.paid_for', {
              value1: this.formatAsset(op.current_pays),
              value2: this.formatAsset(op.open_pays),
            })}
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'withdraw_vesting_operation' })
    formatWithdrawVesting({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: withdraw_vesting }>) {
      const formattedHp = this.getFormattedHivePower(op.vesting_shares);
      const hasAmount = op.vesting_shares && BigInt(op.vesting_shares.amount) > 0n;
      return {
        ...target,
        value: (
          <span>
            {hasAmount
              ? t('profile.start_power_down', { amount: formattedHp })
              : t('profile.stop_power_down')}
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'recurrent_transfer_operation' })
    formatRecurrentTransfer({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: recurrent_transfer }>) {
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
      return {
        ...target,
        value: (
          <span>
            {t(key, {
              value: this.formatAsset(op.amount),
              recurrence: op.recurrence,
              executions: op.executions,
            })}
            <Link href={`/@${other}`} className="font-semibold text-primary hover:text-destructive">
              {other}
            </Link>
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'fill_recurrent_transfer_operation' })
    formatFillRecurrentTransfer({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: fill_recurrent_transfer }>) {
      const outgoing = op.from === username;
      const other = outgoing ? op.to : op.from;
      return {
        ...target,
        value: (
          <span>
            {t(
              outgoing
                ? 'profile.fill_recurrent_transfer_to'
                : 'profile.fill_recurrent_transfer_from',
              {
                value: this.formatAsset(op.amount),
                remaining: op.remaining_executions,
              }
            )}
            <Link href={`/@${other}`} className="font-semibold text-primary hover:text-destructive">
              {other}
            </Link>
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'failed_recurrent_transfer_operation' })
    formatFailedRecurrentTransfer({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: failed_recurrent_transfer }>) {
      const outgoing = op.from === username;
      const other = outgoing ? op.to : op.from;
      return {
        ...target,
        value: (
          <span className="text-destructive">
            {t(
              outgoing
                ? 'profile.failed_recurrent_transfer_to'
                : 'profile.failed_recurrent_transfer_from',
              {
                value: this.formatAsset(op.amount),
                failures: op.consecutive_failures,
              }
            )}
            <Link href={`/@${other}`} className="font-semibold text-primary hover:text-destructive">
              {other}
            </Link>
            {op.deleted ? t('profile.recurrent_transfer_deleted') : ''}
          </span>
        ),
      };
    }

    @WaxFormattable({ matchProperty: 'type', matchValue: 'author_reward_operation' })
    formatAuthorReward({
      source: { value: op },
      target,
    }: IFormatFunctionArguments<{ value: author_reward }>) {
      const formattedHp = this.getFormattedHivePower(op.vesting_payout);
      return {
        ...target,
        value: (
          <span>
            {t('profile.author_reward', {
              hbd: this.formatAsset(op.hbd_payout),
              hive: this.formatAsset(op.hive_payout),
              hp: formattedHp,
            })}
          </span>
        ),
      };
    }
  }

  return WalletOperationsFormatter;
}
