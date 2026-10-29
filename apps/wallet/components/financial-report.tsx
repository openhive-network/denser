'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@ui/components';
import { Checkbox } from '@ui/components/checkbox';
import { useTranslation } from '@/wallet/i18n/client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { HiveOperation } from '@hive/common-hiveio-packages/wax';
import { formatAsset, isNaiAsset } from '@ui/lib/asset-format';
import { useFinancialReportOperations } from '@/wallet/components/hooks/use-financial-report-operations';
import Loading from '@ui/components/loading';
import {
  FINANCIAL_REPORT_OP_TYPES,
  FINANCIAL_REPORT_PERIODS,
  FinancialReportOpType,
  FinancialReportPeriod,
  filterFinancialReportOperations
} from '@/wallet/lib/financial-report';
interface FinancialReportProps {
  username: string;
}

const escapeCSV = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  let str = String(value);
  // Prevent CSV formula injection: prefix formula-triggering characters with
  // a single quote so spreadsheet applications treat the cell as plain text
  // instead of evaluating it as a formula. Attacker-controlled fields like
  // transfer memos can contain arbitrary content from the blockchain.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatAmount = (amount: unknown): string => (isNaiAsset(amount) ? formatAsset(amount) : '');

const convertHistoryToCSV = (transactions: HiveOperation[]) => {
  let csv = '';
  const columns = [
    'timestamp',
    'operation_type',
    'account',
    'from',
    'to',
    'amount',
    'memo',
    'permlink',
    'hbd_payout',
    'hive_payout',
    'vesting_payout',
    'reward'
  ];

  csv += columns.join(',') + '\r\n';

  transactions.forEach((transaction) => {
    const { op, timestamp } = transaction;
    const value = op.value as Record<string, unknown>;
    const opType = op.type;

    const row: Record<string, string> = {
      timestamp: String(timestamp),
      operation_type: opType,
      account: '',
      from: '',
      to: '',
      amount: '',
      memo: '',
      permlink: '',
      hbd_payout: '',
      hive_payout: '',
      vesting_payout: '',
      reward: ''
    };

    switch (opType) {
      case 'transfer_operation':
        row.from = String(value.from || '');
        row.to = String(value.to || '');
        row.amount = formatAmount(value.amount);
        row.memo = String(value.memo || '');
        break;

      case 'curation_reward_operation':
        row.account = String(value.curator || '');
        row.reward = formatAmount(value.reward);
        row.permlink = String(value.comment_permlink || '');
        break;

      case 'author_reward_operation':
        row.account = String(value.author || '');
        row.permlink = String(value.permlink || '');
        row.hbd_payout = formatAmount(value.hbd_payout);
        row.hive_payout = formatAmount(value.hive_payout);
        row.vesting_payout = formatAmount(value.vesting_payout);
        break;

      case 'comment_reward_operation':
        row.account = String(value.author || '');
        row.permlink = String(value.permlink || '');
        row.hbd_payout = formatAmount(value.payout);
        break;

      case 'comment_benefactor_reward_operation':
        row.account = String(value.benefactor || '');
        row.permlink = String(value.permlink || '');
        row.hbd_payout = formatAmount(value.hbd_payout);
        row.hive_payout = formatAmount(value.hive_payout);
        row.vesting_payout = formatAmount(value.vesting_payout);
        break;

      case 'producer_reward_operation':
        row.account = String(value.producer || '');
        row.vesting_payout = formatAmount(value.vesting_shares);
        break;

      case 'interest_operation':
        row.account = String(value.owner || '');
        row.amount = formatAmount(value.interest);
        break;

      case 'proposal_pay_operation':
        row.account = String(value.receiver || '');
        row.from = String(value.payer || '');
        row.to = String(value.receiver || '');
        row.amount = formatAmount(value.payment);
        break;

      case 'dhf_funding_operation':
        row.amount = formatAmount(value.additional_funds);
        break;

      default:
        row.account = String(value.account || value.owner || value.author || '');
        row.amount = formatAmount(value.amount || value.reward);
    }

    const formatted = columns.map((col) => escapeCSV(row[col]));
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

const isFinancialReportPeriod = (value: string): value is FinancialReportPeriod =>
  FINANCIAL_REPORT_PERIODS.some((period) => period === value);

const FinancialReport: React.FC<FinancialReportProps> = ({ username }) => {
  const { t } = useTranslation('common_wallet');
  const [financialReportPeriod, setFinancialReportPeriod] = useState<FinancialReportPeriod>('last7days');
  const [selectedOpTypes, setSelectedOpTypes] = useState<Set<FinancialReportOpType>>(
    () => new Set(FINANCIAL_REPORT_OP_TYPES)
  );
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const selectedPeriodItemRef = useRef<HTMLDivElement>(null);
  const matchStatusId = useId();
  const { data: operationHistoryData, isPending, isError, refetch } = useFinancialReportOperations(username);

  const matchCount = useMemo(() => {
    if (!operationHistoryData) return 0;
    return filterFinancialReportOperations(operationHistoryData, selectedOpTypes, financialReportPeriod).length;
  }, [operationHistoryData, selectedOpTypes, financialReportPeriod]);

  useEffect(() => {
    if (!isPeriodMenuOpen) return;
    // Radix focuses the menu (or its first item) once the portalled content mounts; move focus to
    // the current period after that.
    const frame = requestAnimationFrame(() => selectedPeriodItemRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isPeriodMenuOpen]);

  const handleToggleOpType = (opType: FinancialReportOpType) => {
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

  const handlePeriodChange = (value: string) => {
    if (isFinancialReportPeriod(value)) setFinancialReportPeriod(value);
  };

  const handleDownload = () => {
    if (!operationHistoryData) return;
    const filtered = filterFinancialReportOperations(operationHistoryData, selectedOpTypes, financialReportPeriod);
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
          {FINANCIAL_REPORT_OP_TYPES.map((opType) => (
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
        <DropdownMenu open={isPeriodMenuOpen} onOpenChange={setIsPeriodMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative border border-zinc-500">
              <div className="w-28 text-left">
                <span>{t(`transfers_page.report_periods.${financialReportPeriod}`)}</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 transform text-xl">▾</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={financialReportPeriod} onValueChange={handlePeriodChange}>
              {FINANCIAL_REPORT_PERIODS.map((reportPeriod) => (
                <DropdownMenuRadioItem
                  key={reportPeriod}
                  value={reportPeriod}
                  ref={reportPeriod === financialReportPeriod ? selectedPeriodItemRef : undefined}
                  className="cursor-pointer"
                >
                  {t(`transfers_page.report_periods.${reportPeriod}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {isPending ? (
          <Loading loading={true} />
        ) : (
          operationHistoryData && (
            <Button
              onClick={handleDownload}
              disabled={selectedOpTypes.size === 0 || matchCount === 0}
              aria-describedby={matchCount === 0 ? matchStatusId : undefined}
            >
              {t('transfers_page.download_report')}
            </Button>
          )
        )}
        {!isPending && operationHistoryData && (
          <span
            id={matchStatusId}
            role="status"
            className={`text-xs ${matchCount === 0 ? 'text-destructive' : 'text-primary/70'}`}
          >
            {matchCount === 0
              ? t('transfers_page.report_no_operations')
              : t('transfers_page.report_operations_found', { count: matchCount })}
          </span>
        )}
        {isError && (
          <>
            <span className="text-xs text-destructive">{t('profile.account_history_error')}</span>
            <Button variant="outlineRed" onClick={() => refetch()}>
              {t('global.retry')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialReport;
