import { useQuery } from '@tanstack/react-query';
import { getDirectDelegations } from '@/wallet/lib/hive';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { prepareRC } from '@/wallet/lib/utils';
import Big from 'big.js';
import RCRow from './rc-row';
import { useTranslation } from '@/wallet/i18n/client';
import { RC_SUMMARY_DECIMALS } from '@/wallet/feature/transfers-page/lib/rc-amount';

const COLUMN_COUNT = 3;

const RCTable = ({ account }: { account: string }) => {
  const { t } = useTranslation('common_wallet');
  const { data, isPending } = useQuery({
    queryKey: ['resourceCredits', account],
    queryFn: () => getDirectDelegations(account),
    select: (data) => {
      return {
        list: data.rc_direct_delegations,
        total: data.rc_direct_delegations.reduce(
          (acc, curr) => Big(acc).plus(curr.delegated_rc).toString(),
          '0'
        )
      };
    }
  });

  return (
    <div className="flex w-full flex-col items-center gap-2" data-testid="wallet-rc-delegations">
      <h2 className="text-lg font-bold underline">{t('resource_credits.title')}</h2>
      <table className="w-full">
        <tbody>
          {isPending ? (
            <tr>
              <td colSpan={COLUMN_COUNT}>
                <div className="flex h-48 items-center justify-center">
                  <CircleSpinner size={48} color="#dc2626" />
                </div>
              </td>
            </tr>
          ) : data ? (
            data.list.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-1 py-2 text-center text-sm sm:px-4">
                  {t('resource_credits.no_delegations')}
                </td>
              </tr>
            ) : (
              data.list.map((element) => (
                <RCRow key={element.to} delegated_rc={element.delegated_rc} to={element.to} account={account} />
              ))
            )
          ) : null}
        </tbody>
      </table>
      <span className="text-sm" data-testid="wallet-rc-delegations-total">
        {t('resource_credits.total', { amount: prepareRC(data?.total ?? '0', t, RC_SUMMARY_DECIMALS) })}
      </span>
    </div>
  );
};

export default RCTable;
