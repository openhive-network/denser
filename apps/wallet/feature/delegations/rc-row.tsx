import { prepareRC } from '@/wallet/lib/utils';
import { Link } from '@hive/ui';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '@/wallet/i18n/client';
import { RC_SUMMARY_DECIMALS } from '@/wallet/feature/transfers-page/lib/rc-amount';
import RevokeRcDialog from './revoke-rc-dialog';

const RCRow = ({ delegated_rc, to, account }: { delegated_rc: number; to: string; account: string }) => {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const userOwner = account === user.username;
  const amount = prepareRC(delegated_rc.toString(), t, RC_SUMMARY_DECIMALS);

  return (
    <tr
      className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700"
      data-testid="wallet-rc-delegation-item"
    >
      <td className="px-1 py-2 sm:px-4">
        {/* Equal side tracks keep the amount centred under the heading; the delegatee and Revoke wrap beside it. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4">
          <span className="col-start-2 text-center" data-testid="wallet-rc-delegation-amount">
            {amount}
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href={`/@${to}/transfers`}
              className="min-w-0 break-all text-destructive"
              data-testid="wallet-rc-delegation-delegatee"
            >
              {`@${to}`}
            </Link>
            {userOwner ? <RevokeRcDialog delegator={account} delegatee={to} amount={amount} /> : null}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default RCRow;
