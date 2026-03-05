import { TFunction } from 'i18next';
import TimeAgo from '@hive/ui/components/time-ago';
import { Link } from '@hive/ui';
import { SidechainAccountTransaction } from '@ui/lib/sidechain-rewards';

interface SidechainHistoryTableProps {
  isLoading: boolean;
  transactions: SidechainAccountTransaction[] | undefined;
  username: string;
  token: string;
  t: TFunction<'common_wallet', undefined>;
}

const accountLink = (name: string) => (
  <Link href={`/@${name}`} className="font-semibold text-primary hover:text-destructive">
    {name}
  </Link>
);

const formatTokenQuantity = (rawQuantity: string): string => {
  const parsed = Number.parseFloat(rawQuantity);
  if (!Number.isFinite(parsed)) {
    return rawQuantity || '0';
  }

  const trimmedRaw = rawQuantity.trim();
  const rawDecimals = trimmedRaw.includes('.') ? trimmedRaw.split('.')[1]?.length ?? 0 : 0;
  const boundedDecimals = Math.min(Math.max(rawDecimals, 0), 8);
  const fixed = parsed.toFixed(boundedDecimals);
  const normalized = fixed.replace(/\.?0+$/, '') || '0';
  const [integerPart, decimalPart] = normalized.split('.');
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimalPart ? `${withCommas}.${decimalPart}` : withCommas;
};

const formatOperationDescription = (
  transaction: SidechainAccountTransaction,
  username: string,
  token: string
): JSX.Element => {
  const normalizedUser = username.trim().toLowerCase();
  const op = transaction.operation.toLowerCase();
  const symbol = (transaction.symbol || token).toUpperCase();
  const quantity = formatTokenQuantity(transaction.quantity || '0');
  const amountWithToken = `${quantity} ${symbol}`;
  const from = transaction.from;
  const to = transaction.to;
  const normalizedFrom = from.trim().toLowerCase();
  const normalizedTo = to.trim().toLowerCase();
  const isDistributionContract = (name: string) => name.trim().toLowerCase() === 'contract_distribution';
  const counterpartyLabel = (name: string): JSX.Element =>
    isDistributionContract(name) ? (
      <span className="font-semibold">{`${symbol} rewards distribution`}</span>
    ) : (
      accountLink(name)
    );

  if (op.includes('undeleg')) {
    if (normalizedFrom === normalizedUser && to && normalizedTo !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} undelegated from `}
          {counterpartyLabel(to)}
        </span>
      );
    }

    if (normalizedTo === normalizedUser && from && normalizedFrom !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} undelegated by `}
          {counterpartyLabel(from)}
        </span>
      );
    }

    return <span>{`${amountWithToken} undelegated`}</span>;
  }

  if (op.includes('delegat')) {
    if (normalizedFrom === normalizedUser && to && normalizedTo !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} delegated to `}
          {counterpartyLabel(to)}
        </span>
      );
    }

    if (normalizedTo === normalizedUser && from && normalizedFrom !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} delegated by `}
          {counterpartyLabel(from)}
        </span>
      );
    }

    return <span>{`${amountWithToken} delegated`}</span>;
  }

  if (op.includes('unstake')) {
    return <span>{`${amountWithToken} unstaked`}</span>;
  }

  if (op.includes('stake')) {
    if (to && normalizedTo !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} staked for `}
          {counterpartyLabel(to)}
        </span>
      );
    }
    return <span>{`${amountWithToken} staked`}</span>;
  }

  if (op.includes('buy')) {
    return <span>{`${amountWithToken} bought`}</span>;
  }

  if (op.includes('sell')) {
    return <span>{`${amountWithToken} sold`}</span>;
  }

  if (op.includes('transfer')) {
    if (normalizedTo === normalizedUser && from && normalizedFrom !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} received from `}
          {counterpartyLabel(from)}
        </span>
      );
    }

    if (normalizedFrom === normalizedUser && to && normalizedTo !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} sent to `}
          {counterpartyLabel(to)}
        </span>
      );
    }

    return <span>{`${amountWithToken} transferred`}</span>;
  }

  if (op.includes('distribution') || op.includes('claim') || op.includes('issue')) {
    if (from && normalizedFrom !== normalizedUser) {
      return (
        <span>
          {`${amountWithToken} received from `}
          {counterpartyLabel(from)}
        </span>
      );
    }
    return <span>{`${amountWithToken} received`}</span>;
  }

  return <span>{`${amountWithToken} (${transaction.operation})`}</span>;
};

const SidechainHistoryTable = ({
  t,
  isLoading,
  transactions = [],
  username,
  token
}: SidechainHistoryTableProps) => {
  if (isLoading) return <div>{t('global.loading')}</div>;
  if (transactions.length === 0) {
    return (
      <div
        className="py-12 text-center text-3xl text-destructive"
        data-testid="wallet-token-history-no-transactions-found"
      >
        {t('profile.no_transactions_found')}
      </div>
    );
  }

  return (
    <table className="w-full max-w-6xl p-2">
      <tbody>
        {transactions.map((transaction) => (
          <tr
            key={`${transaction.transactionId}-${transaction.operation}-${transaction.blockNumber}`}
            className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
            data-testid="wallet-token-history-row"
          >
            <td className="px-4 py-2 sm:min-w-[150px]">
              <TimeAgo date={new Date(transaction.timestamp).toISOString()} />
            </td>
            <td className="px-4 py-2 sm:min-w-[300px]">
              {formatOperationDescription(transaction, username, token)}
            </td>
            {transaction.memo ? (
              <td className="hidden break-all px-4 py-2 sm:block">{transaction.memo}</td>
            ) : (
              <td></td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SidechainHistoryTable;
