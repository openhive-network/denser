import { memo, ReactNode } from 'react';
import TimeAgo from '@hive/ui/components/time-ago';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';

interface HistoryTableRowProps {
  operation: HiveOperation;
  formatOperationDescription: (operation: HiveOperation) => ReactNode;
}

const HistoryTableRow = ({ operation, formatOperationDescription }: HistoryTableRowProps) => (
  <tr
    className="m-0 w-full p-0 text-xs even:bg-background-tertiary sm:text-sm"
    data-testid="wallet-account-history-row"
  >
    <td className="px-4 py-2 sm:min-w-[150px]">
      <TimeAgo date={operation.timestamp} />
    </td>
    <td className="px-4 py-2 sm:min-w-[300px]">{formatOperationDescription(operation)}</td>
    {operation.op.value.memo ? (
      <td className="hidden break-all px-4 py-2 sm:block">{operation.op.value.memo}</td>
    ) : (
      <td></td>
    )}
  </tr>
);

export default memo(HistoryTableRow);
