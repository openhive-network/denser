import { prepareRC } from '@/wallet/lib/utils';
import Link from 'next/link';
import { useUndelegateMutation } from './hooks/use-undelegate-mutation';
import { Button } from '@ui/components';
import { CircleSpinner } from 'react-spinners-kit';
import { useUser } from '@smart-signer/lib/auth/use-user';

const RCRow = ({ delegated_rc, to, account }: { delegated_rc: number; to: string; account: string }) => {
  const undelegateMutation = useUndelegateMutation();
  const handleUndelegate = (toAccount: string) => {
    if (window.confirm(`Are you sure you want to revoke RC delegation to @${toAccount}?`)) {
      undelegateMutation.mutate(toAccount);
    }
  };
  const { user } = useUser();
  const userOwner = account === user.username;

  return (
    <tr className="m-0 p-0 text-sm even:bg-slate-100 dark:even:bg-slate-700">
      <td className="py-2 pl-10">{prepareRC(delegated_rc.toString())}</td>
      <td className="px-1 py-2 text-destructive sm:px-4">
        <Link href={`/@${to}/transfers`}>{`@${to}`}</Link>
      </td>
      <td className="py-2">
        {userOwner ? (
          <Button
            disabled={undelegateMutation.isLoading}
            variant="outlineRed"
            onClick={() => handleUndelegate(to)}
          >
            {undelegateMutation.isLoading ? (
              <span className="flex h-5 w-12 items-center justify-center">
                <CircleSpinner loading={undelegateMutation.isLoading} size={18} color="#dc2626" />
              </span>
            ) : (
              'Revoke'
            )}
          </Button>
        ) : null}
      </td>
    </tr>
  );
};

export default RCRow;
