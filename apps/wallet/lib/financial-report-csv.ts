import type { NaiAsset } from '@hiveio/wax';

type CsvOperation = { op: { type: string; value: unknown }; timestamp: Date | string };

const COLUMNS = [
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
] as const;

type CsvRow = Record<(typeof COLUMNS)[number], string>;

const LINE_END = '\r\n';

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

const isNaiAsset = (value: unknown): value is NaiAsset =>
  typeof value === 'object' &&
  value !== null &&
  'amount' in value &&
  'precision' in value &&
  'nai' in value &&
  typeof value.amount === 'string' &&
  typeof value.precision === 'number' &&
  typeof value.nai === 'string';

/**
 * The amount in machine format, whatever the reader's locale: all its decimals after a ".", no
 * grouping, then the token name ("1234.567 HBD"). A spreadsheet reads it as a number, and its
 * commas cannot split the cell.
 */
const formatCsvAmount = (value: unknown, naiSymbols: Readonly<Record<string, string>>): string => {
  if (!isNaiAsset(value)) return '';
  const symbol = naiSymbols[value.nai];
  if (!symbol) throw new Error(`Unknown asset NAI: ${value.nai}`);
  const satoshis = BigInt(value.amount);
  const absolute = satoshis < BigInt(0) ? -satoshis : satoshis;
  const scale = BigInt(10) ** BigInt(value.precision);
  const fraction = (absolute % scale).toString().padStart(value.precision, '0');
  const number = `${satoshis < BigInt(0) ? '-' : ''}${absolute / scale}${value.precision > 0 ? `.${fraction}` : ''}`;
  return `${number} ${symbol}`;
};

const toCsvRow = ({ op, timestamp }: CsvOperation, naiSymbols: Readonly<Record<string, string>>): CsvRow => {
  const value: Record<string, unknown> =
    typeof op.value === 'object' && op.value !== null ? { ...op.value } : {};
  const amount = (field: unknown) => formatCsvAmount(field, naiSymbols);
  const row: CsvRow = {
    timestamp: String(timestamp),
    operation_type: op.type,
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

  switch (op.type) {
    case 'transfer_operation':
      row.from = String(value.from || '');
      row.to = String(value.to || '');
      row.amount = amount(value.amount);
      row.memo = String(value.memo || '');
      break;

    case 'curation_reward_operation':
      row.account = String(value.curator || '');
      row.reward = amount(value.reward);
      row.permlink = String(value.comment_permlink || '');
      break;

    case 'author_reward_operation':
      row.account = String(value.author || '');
      row.permlink = String(value.permlink || '');
      row.hbd_payout = amount(value.hbd_payout);
      row.hive_payout = amount(value.hive_payout);
      row.vesting_payout = amount(value.vesting_payout);
      break;

    case 'comment_reward_operation':
      row.account = String(value.author || '');
      row.permlink = String(value.permlink || '');
      row.hbd_payout = amount(value.payout);
      break;

    case 'comment_benefactor_reward_operation':
      row.account = String(value.benefactor || '');
      row.permlink = String(value.permlink || '');
      row.hbd_payout = amount(value.hbd_payout);
      row.hive_payout = amount(value.hive_payout);
      row.vesting_payout = amount(value.vesting_payout);
      break;

    case 'producer_reward_operation':
      row.account = String(value.producer || '');
      row.vesting_payout = amount(value.vesting_shares);
      break;

    case 'interest_operation':
      row.account = String(value.owner || '');
      row.amount = amount(value.interest);
      break;

    case 'proposal_pay_operation':
      row.account = String(value.receiver || '');
      row.from = String(value.payer || '');
      row.to = String(value.receiver || '');
      row.amount = amount(value.payment);
      break;

    case 'dhf_funding_operation':
      row.amount = amount(value.additional_funds);
      break;

    default:
      row.account = String(value.account || value.owner || value.author || '');
      row.amount = amount(value.amount || value.reward);
  }
  return row;
};

/**
 * The financial report of `operations` as CSV: a header line, then one line per operation. Amounts
 * are in machine format, independent of the reader's locale; `naiSymbols` names each asset's token
 * (`getNaiSymbols()`). Throws for an amount whose NAI it does not name.
 */
export const financialReportCsv = (
  operations: readonly CsvOperation[],
  naiSymbols: Readonly<Record<string, string>>
): string => {
  const lines = operations.map((operation) => {
    const row = toCsvRow(operation, naiSymbols);
    return COLUMNS.map((column) => escapeCSV(row[column])).join(',');
  });
  return [COLUMNS.join(','), ...lines].map((line) => line + LINE_END).join('');
};
