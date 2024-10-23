import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { getAccountHistory } from '../lib/hive';
import { AccountHistory, OpType } from '../store/app-types';

interface FinancialReportProps {
  username: string;
}

type FinancialReportPeriod = 'last7days' | 'last14days' | 'last30days' | 'last60days';
const allReportPeriods: FinancialReportPeriod[] = ['last7days', 'last14days', 'last30days', 'last60days'];
const opTypes: OpType[] = ['transfer'];

const dateDiffInDays = (a: Date, b: Date) => {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};

const convertHistoryToCSV = (transactions: AccountHistory[]) => {
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
    'hive_payout',
    'payout_must_be_claimed',
    'permlink',
    'vesting_payout',
    'author_rewards',
    'beneficiary_payout_value',
    'curator_payout_value',
    'payout',
    'total_payout_value'
  ];

  csv += columns.join(', ') + '\r\n';

  transactions.forEach((transaction) => {
    const formatted = [
      transaction[1].timestamp,
      transaction[1].op[0],
      transaction[1].op[1].amount,
      transaction[1].op[1].from,
      transaction[1].op[1].to,
      transaction[1].op[1].memo,
      transaction[1].op[1].account,
      transaction[1].op[1].reward_hive,
      transaction[1].op[1].reward_hbd,
      transaction[1].op[1].reward_hive,
      'payout_must_be_claimed',
      'permlink',
      'vesting_payout',
      'author_rewards',
      'beneficiary_payout_value',
      'curator_payout_value',
      'payout',
      'total_payout_value'
    ];

    csv += formatted.join(', ') + '\r\n';
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

const FinancialReport: React.FC<FinancialReportProps> = ({ username }) => {
  const { t } = useTranslation('common_wallet');
  const [financialReportPeriod, setFinancialReportPeriod] = useState<FinancialReportPeriod>('last7days');
  const [report, setReport] = useState<string | null>(null);

  const generateReport = async () => {
    const transactions = await getAccountHistory(username, -1, 1000);
    const filtered = transactions.filter((transaction) => {
      const opType = transaction[1].op!.at(0);
      if (!!opType) {
        return (
          opTypes.includes(opType as OpType) &&
          dateDiffInDays(new Date(transaction[1].timestamp), new Date()) <=
            Number(financialReportPeriod.match(/\d+/g))
        );
      }
    });

    setReport(convertHistoryToCSV(filtered));
  };

  return (
    <div className="border-y-2 border-zinc-500 p-2 sm:p-4">
      <div className="font-semibold">{t('transfers_page.financial_report')}</div>
      <p className="text-xs leading-relaxed text-primary/70" data-testid="wallet-account-history-description">
        {t('transfers_page.financial_report_description')}
      </p>
      <div className="mt-2 flex gap-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="border border-white">
              <div>
                <span>{t(`transfers_page.report_periods.${financialReportPeriod}`)}</span>
                <span className="m-1 text-xl">▾</span>
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
        <Button onClick={generateReport}>{t('transfers_page.generate_report')}</Button>
        {report && <Button onClick={() => downloadCSV(report)}>{t('transfers_page.download_report')}</Button>}
      </div>
    </div>
  );
};

export default FinancialReport;
