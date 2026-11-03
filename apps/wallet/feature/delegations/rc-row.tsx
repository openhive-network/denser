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
      <td className="px-1 py-2 text-center sm:px-4">{amount}</td>
      <td className="px-1 py-2 text-destructive sm:px-4">
        <Link href={`/@${to}/transfers`}>{`@${to}`}</Link>
      </td>
      <td className="px-1 py-2 sm:px-4">
        {userOwner ? <RevokeRcDialog delegator={account} delegatee={to} amount={amount} /> : null}
      </td>
    </tr>
  );
};

export default RCRow;
