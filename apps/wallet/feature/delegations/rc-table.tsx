import { useQuery } from '@tanstack/react-query';
import { getDirectDelegations } from '@/wallet/lib/hive';
import { CircleSpinner } from 'react-spinners-kit';
import { prepareRC } from '@/wallet/lib/utils';
import Big from 'big.js';
import RCRow from './rc-row';

const RCTable = ({ account }: { account: string }) => {
  const { data, isLoading } = useQuery(['resourceCredits', account], () => getDirectDelegations(account), {
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
    <div className="flex w-full flex-col items-center">
      <h2 className="text-lg font-bold underline">Resource Credits</h2>
      <div className="flex w-full flex-col gap-2">
        <table>
          <tbody>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <CircleSpinner size={48} color="#dc2626" />
              </div>
            ) : data ? (
              data.list.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-1 py-2 text-center text-sm sm:px-4">
                    No delegations found
                  </td>
                </tr>
              ) : (
                data.list.map((element, index) => (
                  <RCRow key={index} delegated_rc={element.delegated_rc} to={element.to} account={account} />
                ))
              )
            ) : null}
          </tbody>
          <span className="text-sm">total: {prepareRC(data?.total ?? '0')}</span>
        </table>
      </div>
    </div>
  );
};

export default RCTable;
