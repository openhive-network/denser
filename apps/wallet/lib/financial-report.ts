export const FINANCIAL_REPORT_OP_TYPES = [
  'curation_reward_operation',
  'author_reward_operation',
  'producer_reward_operation',
  'comment_reward_operation',
  'comment_benefactor_reward_operation',
  'interest_operation',
  'proposal_pay_operation',
  'dhf_funding_operation',
  'transfer_operation'
] as const;

export type FinancialReportOpType = (typeof FINANCIAL_REPORT_OP_TYPES)[number];

export const FINANCIAL_REPORT_PERIODS = ['last7days', 'last14days', 'last30days', 'last60days'] as const;

export type FinancialReportPeriod = (typeof FINANCIAL_REPORT_PERIODS)[number];

type ReportableOperation = { op: { type: string }; timestamp: Date | string };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const periodToDays = (period: FinancialReportPeriod) => parseInt(period.match(/\d+/)?.[0] ?? '0', 10);

const isFinancialReportOpType = (opType: string): opType is FinancialReportOpType =>
  FINANCIAL_REPORT_OP_TYPES.some((reportOpType) => reportOpType === opType);

/** Operations whose type is selected and whose timestamp lies within `period` days before `now`. */
export const filterFinancialReportOperations = <T extends ReportableOperation>(
  operations: T[],
  selectedOpTypes: ReadonlySet<FinancialReportOpType>,
  period: FinancialReportPeriod,
  now: Date = new Date()
): T[] => {
  const days = periodToDays(period);
  return operations.filter(
    ({ op, timestamp }) =>
      isFinancialReportOpType(op.type) &&
      selectedOpTypes.has(op.type) &&
      Math.floor((now.getTime() - new Date(timestamp).getTime()) / MS_PER_DAY) <= days
  );
};
