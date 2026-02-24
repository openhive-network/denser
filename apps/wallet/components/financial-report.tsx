'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components';
import { Checkbox } from '@ui/components/checkbox';
import { useTranslation } from '@/wallet/i18n/client';
import { useMemo, useState } from 'react';
import { HiveOperation, OpType } from '@hive/common-hiveio-packages/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import dayjs from 'dayjs';
import { useFinancialReportOperations } from '@/wallet/components/hooks/use-financial-report-operations';
import Loading from '@ui/components/loading';
interface FinancialReportProps {
  username: string;
}

type FinancialReportPeriod = 'last7days' | 'last14days' | 'last30days' | 'last60days';
const allReportPeriods: FinancialReportPeriod[] = ['last7days', 'last14days', 'last30days', 'last60days'];
const allOpTypes: OpType[] = [
  'curation_reward_operation',
  'author_reward_operation',
  'producer_reward_operation',
  'comment_reward_operation',
  'comment_benefactor_reward_operation',
  'interest_operation',
  'proposal_pay_operation',
  'sps_fund_operation',
  'transfer_operation'
];

const dateDiffInDays = (a: Date, b: Date) => {
  return dayjs(b).diff(dayjs(a), 'day');
};

const convertHistoryToCSV = (transactions: HiveOperation[]) => {
  const hiveChain = hiveChainService.reuseHiveChain();
  let csv = '';
  const columns = [
    'timestamp',
    'opType',
    'amount',
    'from',
    'to',
    'memo',
    'author',
    'curators_vesting_payout',
    'hbd_payout',
    'hive_payout'
  ];

  csv += columns.join(',') + '\r\n';

  transactions.forEach((transaction) => {
    const formatted = [
      transaction.timestamp,
      transaction.op.type,
      hiveChain?.formatter.format(transaction.op.value.amount) || 0,
      transaction.op.value.from,
      transaction.op.value.to,
      transaction.op.value.memo,
      transaction.op.value.account,
      hiveChain?.formatter.format(transaction.op.value.reward_vests) || 0,
      hiveChain?.formatter.format(transaction.op.value.reward_hbd) || 0,
      hiveChain?.formatter.format(transaction.op.value.reward_hive) || 0
    ];

    csv += formatted.join(',') + '\r\n';
  });

  return csv;
};

const downloadCSV = (csv: string) => {
  const csvData = new Blob([csv], { type: 'text/csv' });
  const csvURL = URL.createObjectURL(csvData);
  const link = document.createElement('a');
  link.href = csvURL;
  link.download = 'hive-report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const filterOperations = (
  operationHistoryData: HiveOperation[],
  selectedOpTypes: Set<OpType>,
  financialPeriod: FinancialReportPeriod
) => {
  const days = parseInt(financialPeriod.match(/\d+/)?.[0] ?? '0', 10);
  const now = new Date();
  return operationHistoryData.filter(
    ({ op, timestamp }) =>
      selectedOpTypes.has(op.type as OpType) && dateDiffInDays(new Date(timestamp), now) <= days
  );
};

const FinancialReport: React.FC<FinancialReportProps> = ({ username }) => {
  const { t } = useTranslation('common_wallet');
  const [financialReportPeriod, setFinancialReportPeriod] = useState<FinancialReportPeriod>('last7days');
  const [selectedOpTypes, setSelectedOpTypes] = useState<Set<OpType>>(() => new Set(allOpTypes));
  const { data: operationHistoryData, isLoading } = useFinancialReportOperations(username);

  const matchCount = useMemo(() => {
    if (!operationHistoryData) return 0;
    return filterOperations(operationHistoryData, selectedOpTypes, financialReportPeriod).length;
  }, [operationHistoryData, selectedOpTypes, financialReportPeriod]);

  const handleToggleOpType = (opType: OpType) => {
    setSelectedOpTypes((prev) => {
      const next = new Set(prev);
      if (next.has(opType)) {
        next.delete(opType);
      } else {
        next.add(opType);
      }
      return next;
    });
  };

  const handleDownload = () => {
    if (!operationHistoryData) return;
    const filtered = filterOperations(operationHistoryData, selectedOpTypes, financialReportPeriod);
    if (filtered.length === 0) return;
    downloadCSV(convertHistoryToCSV(filtered));
  };

  return (
    <div className="border-t-2 border-zinc-500 p-2 sm:p-4">
      <div className="font-semibold">{t('transfers_page.financial_report')}</div>
      <p className="text-xs leading-relaxed text-primary/70" data-testid="wallet-financial-report-description">
        {t('transfers_page.financial_report_description')}
      </p>

      <div className="mt-2">
        <span className="text-xs font-medium">{t('transfers_page.report_select_operation_types')}</span>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {allOpTypes.map((opType) => (
            <label key={opType} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                className="border-zinc-700"
                checked={selectedOpTypes.has(opType)}
                onClick={() => handleToggleOpType(opType)}
              />
              <span>{t(`transfers_page.report_operation_types.${opType}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative border border-white">
              <div className="w-28 text-left">
                <span>{t(`transfers_page.report_periods.${financialReportPeriod}`)}</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 transform text-xl">▾</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              {allReportPeriods.map((reportPeriod) => (
                <DropdownMenuItem
                  key={reportPeriod}
                  className="cursor-pointer"
                  onClick={() => setFinancialReportPeriod(reportPeriod)}
                >
                  {t(`transfers_page.report_periods.${reportPeriod}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {isLoading ? (
          <Loading loading={true} />
        ) : (
          operationHistoryData && (
            <Button onClick={handleDownload} disabled={selectedOpTypes.size === 0 || matchCount === 0}>
              {t('transfers_page.download_report')}
            </Button>
          )
        )}
        {!isLoading && operationHistoryData && (
          <span className={`text-xs ${matchCount === 0 ? 'text-destructive' : 'text-primary/70'}`}>
            {matchCount === 0
              ? t('transfers_page.report_no_operations')
              : t('transfers_page.report_operations_found', { count: matchCount })}
          </span>
        )}
      </div>
    </div>
  );
};

export default FinancialReport;
