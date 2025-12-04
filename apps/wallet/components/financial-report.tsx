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
import { HiveOperation, OpType } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import moment from "moment";

interface FinancialReportProps {
  username: string;
  operationHistoryData?: HiveOperation[]
}

type FinancialReportPeriod = 'last7days' | 'last14days' | 'last30days' | 'last60days';
const allReportPeriods: FinancialReportPeriod[] = ['last7days', 'last14days', 'last30days', 'last60days'];
const opTypes: OpType[] = [
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
  return moment(b).diff(moment(a), "days");
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
    // 'payout_must_be_claimed',
    // 'permlink',
    // 'vesting_payout',
    // 'author_rewards',
    // 'beneficiary_payout_value',
    // 'curator_payout_value',
    // 'payout',
    // 'total_payout_value'
  ];

  csv += columns.join(',') + '\r\n';

  transactions.forEach((transaction) => {
    console.log(transaction);
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
      // 'payout_must_be_claimed',
      // 'permlink',
      // 'vesting_payout',
      // 'author_rewards',
      // 'beneficiary_payout_value',
      // 'curator_payout_value',
      // 'payout',
      // 'total_payout_value'
    ];

    csv += formatted.join(',') + '\r\n';
  });

  return csv;
};

const downloadCSV = async (csv: string) => {
  const csvData = new Blob([csv], { type: 'text/csv' });
  const csvURL = URL.createObjectURL(csvData);
  const link = document.createElement('a');
  link.href = csvURL;
  link.download = 'hive-report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const generateReport = async (financialPeriod: FinancialReportPeriod, operationHistoryData : HiveOperation[]) => {
  const days = parseInt(financialPeriod.match(/\d+/)?.[0] ?? "0", 10);
  const now = new Date();
  const filtered = operationHistoryData.filter(({ op, timestamp }) =>
    opTypes.includes(op.type as OpType) &&
    dateDiffInDays(new Date(timestamp), now) <= days
  );

  return convertHistoryToCSV(filtered);
};

const FinancialReport: React.FC<FinancialReportProps> = ({ username, operationHistoryData }) => {
  const { t } = useTranslation('common_wallet');
  const [financialReportPeriod, setFinancialReportPeriod] = useState<FinancialReportPeriod>('last7days');

  return (
    <div className="border-t-2 border-zinc-500 p-2 sm:p-4">
      <div className="font-semibold">{t('transfers_page.financial_report')}</div>
      <p className="text-xs leading-relaxed text-primary/70" data-testid="wallet-financial-report-description">
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
        {operationHistoryData &&
          <Button onClick={async () => await downloadCSV(await generateReport(financialReportPeriod, operationHistoryData))}>
            {t('transfers_page.download_report')}
          </Button>
        }
      </div>
    </div>
  );
};

export default FinancialReport;
