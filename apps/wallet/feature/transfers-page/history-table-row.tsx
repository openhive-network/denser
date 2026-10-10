import { memo, ReactNode } from 'react';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import HistoryMemoCell from './history-memo-cell';

interface HistoryTableRowProps {
  operation: HiveOperation;
  formatOperationDescription: (operation: HiveOperation) => ReactNode;
  username: string;
  isOwnAccount: boolean;
}

const HistoryTableRow = ({
  operation,
  formatOperationDescription,
  username,
  isOwnAccount
}: HistoryTableRowProps) => (
  <tr
    className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
    data-testid="wallet-account-history-row"
  >
    <td className="px-4 py-2 sm:min-w-[150px]">
      <TimeAgo date={operation.timestamp} />
    </td>
    <td className="px-4 py-2 sm:min-w-[300px]">{formatOperationDescription(operation)}</td>
    <HistoryMemoCell memo={operation.op.value.memo} username={username} isOwnAccount={isOwnAccount} />
  </tr>
);

export default memo(HistoryTableRow);
