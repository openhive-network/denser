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
import { AccountHistory, OpType } from '@transaction/lib/extended-hive.chain';

interface FinancialReportProps {
  username: string;
}

type FinancialReportPeriod = 'last7days' | 'last14days' | 'last30days' | 'last60days';
const allReportPeriods: FinancialReportPeriod[] = ['last7days', 'last14days', 'last30days', 'last60days'];
const opTypes: OpType[] = [
  'curation_reward',
  'author_reward',
  'producer_reward',
  'comment_reward',
  'comment_benefactor_reward',
  'interest',
  'proposal_pay',
  'sps_fund',
  'transfer'
];

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
    'hive_payout'
    // 'payout_must_be_claimed',
    // 'permlink',
    // 'vesting_payout',
    // 'author_rewards',
    // 'beneficiary_payout_value',
    // 'curator_payout_value',
    // 'payout',
    // 'total_payout_value'
  ];

  csv += columns.join(', ') + '\r\n';

  transactions.forEach((transaction) => {
    console.log(transaction);
    const opData = transaction[1].op[1];
    const formatted = [
      transaction[1].timestamp,
      transaction[1].op[0],
      opData.amount,
      opData.from,
      opData.to,
      opData.memo,
      opData.account,
      opData.reward_hive,
      opData.reward_hbd,
      opData.reward_hive
      // 'payout_must_be_claimed',
      // 'permlink',
      // 'vesting_payout',
      // 'author_rewards',
      // 'beneficiary_payout_value',
      // 'curator_payout_value',
      // 'payout',
      // 'total_payout_value'
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

const generateReport = async (username: string, financialPeriod: FinancialReportPeriod) => {
  const transactions = await getAccountHistory(username, -1, 1000);
  const filtered = transactions.filter((transaction) => {
    const opType = transaction[1].op![0];
    if (!!opType) {
      return (
        opTypes.includes(opType as OpType) &&
        dateDiffInDays(new Date(transaction[1].timestamp), new Date()) <=
          Number(financialPeriod.match(/\d+/g))
      );
    }
  });

  return convertHistoryToCSV(filtered);
};

const FinancialReport: React.FC<FinancialReportProps> = ({ username }) => {
  const { t } = useTranslation('common_wallet');
  const [financialReportPeriod, setFinancialReportPeriod] = useState<FinancialReportPeriod>('last7days');

  return (
    <div className="border-t-2 border-zinc-500 p-2 sm:p-4">
      <div className="font-semibold">{t('transfers_page.financial_report')}</div>
      <p className="text-xs leading-relaxed text-primary/70" data-testid="wallet-account-history-description">
        {t('transfers_page.financial_report_description')}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
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
        <Button onClick={async () => downloadCSV(await generateReport(username, financialReportPeriod))}>
          {t('transfers_page.download_report')}
        </Button>
      </div>
    </div>
  );
};

export default FinancialReport;
