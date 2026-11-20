import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { financialReportCsv } from './financial-report-csv.ts';

const NAI_SYMBOLS = { '@@000000021': 'HIVE', '@@000000013': 'HBD', '@@000000037': 'VESTS' };
const HEADER =
  'timestamp,operation_type,account,from,to,amount,memo,permlink,hbd_payout,hive_payout,vesting_payout,reward';

const transfer = (amount: string, memo = '') => ({
  timestamp: '2026-10-13T12:00:00',
  op: {
    type: 'transfer_operation',
    value: { from: 'alice', to: 'bob', amount: { amount, precision: 3, nai: '@@000000013' }, memo }
  }
});

// Node takes its default Intl locale from the environment when it starts: a child stands for a
// reader whose browser formats numbers as Polish does ("1 234 567,891").
const csvInLocale = (locale: string, operations: unknown[]): string => {
  const module = fileURLToPath(new URL('./financial-report-csv.ts', import.meta.url));
  const script = `const { financialReportCsv } = await import(${JSON.stringify(module)});
    process.stdout.write(financialReportCsv(${JSON.stringify(operations)}, ${JSON.stringify(NAI_SYMBOLS)}));`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, LC_ALL: locale },
    encoding: 'utf8'
  });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout;
};

describe('financial report CSV', () => {
  it('writes a row from a pl locale with "." decimals and no grouping', () => {
    const csv = csvInLocale('pl_PL.UTF-8', [transfer('1234567891', 'za 1,5')]);
    assert.equal(
      csv,
      `${HEADER}\r\n2026-10-13T12:00:00,transfer_operation,,alice,bob,1234567.891 HBD,"za 1,5",,,,,\r\n`
    );
  });

  it('writes every decimal of the asset and a negative amount with its sign kept as text', () => {
    const csv = financialReportCsv(
      [
        {
          timestamp: '2026-10-13T12:00:00',
          op: {
            type: 'producer_reward_operation',
            value: { producer: 'w', vesting_shares: { amount: '1000001', precision: 6, nai: '@@000000037' } }
          }
        },
        transfer('-5')
      ],
      NAI_SYMBOLS
    );
    const [, producer, negative] = csv.split('\r\n');
    assert.equal(producer, '2026-10-13T12:00:00,producer_reward_operation,w,,,,,,,,1.000001 VESTS,');
    assert.equal(negative, "2026-10-13T12:00:00,transfer_operation,,alice,bob,'-0.005 HBD,,,,,,");
  });

  it('refuses an amount whose NAI it cannot name', () => {
    const op = {
      timestamp: 't',
      op: { type: 'interest_operation', value: { interest: { amount: '1', precision: 3, nai: '@@1' } } }
    };
    assert.throws(() => financialReportCsv([op], NAI_SYMBOLS), /Unknown asset NAI: @@1/);
  });
});
