import { useQuery } from '@tanstack/react-query';
import { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { useTranslation } from '@/wallet/i18n/client';
import { getExpiringVestingDelegations } from '@/wallet/lib/hive';
import { convertToHivePowerAmount } from '@/wallet/lib/utils';
import { useLocale } from '@ui/components/locale-context';
import { formatDateTime } from '@ui/lib/locale-format';


type DynamicGlobalProperties = Pick<
  GetDynamicGlobalPropertiesResponse,
  'total_vesting_fund_hive' | 'total_vesting_shares'
>;

/** Removed HP delegations still locked until their expiration; renders nothing when there are none. */
const ReturningDelegationsTable = ({
  account,
  dynamicData
}: {
  account: string;
  dynamicData: DynamicGlobalProperties;
}) => {
  const { t } = useTranslation('common_wallet');
  const { locale } = useLocale();
  const { data } = useQuery({
    queryKey: ['expiringVestingDelegations', account],
    queryFn: () => getExpiringVestingDelegations(account)
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col items-center" data-testid="wallet-returning-delegations">
      <h2 className="text-lg font-bold underline">{t('delegations_page.returning_delegations')}</h2>
      <p className="text-sm text-slate-500">{t('delegations_page.returning_delegations_description')}</p>
      <table className="w-full">
        <tbody>
          {data.map((element) => (
            <tr
              key={element.id}
              className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700"
              data-testid="wallet-returning-delegation-item"
            >
              <td className="px-1 py-2 sm:px-4">
                {convertToHivePowerAmount(
                  element.vesting_shares,
                  dynamicData.total_vesting_fund_hive,
                  dynamicData.total_vesting_shares,
                  locale
                )}{' '}
                HP
              </td>
              <td className="px-1 py-2 sm:px-4">
                {t('delegations_page.returns')}{' '}
                <time dateTime={`${element.expiration}Z`}>{formatDateTime(element.expiration, locale, 'mediumDateTime')}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReturningDelegationsTable;
