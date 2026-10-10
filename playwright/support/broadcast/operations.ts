/**
 * Reading the operation out of an intercepted broadcast (./interceptor.ts) and asserting its
 * fields, in the API JSON wax sends: `{ type: 'transfer_operation', value: { ... } }` with assets
 * as NAI objects.
 */
import { expect } from '@playwright/test';
import type { InterceptedBroadcast } from './interceptor.ts';

/** An asset as wax's API JSON carries it: `1.000 HIVE` is `{ amount: '1000', precision: 3, nai: '@@000000021' }`. */
export interface NaiAsset {
  amount: string;
  precision: number;
  nai: string;
}

const NAI_BY_SYMBOL: Record<string, Omit<NaiAsset, 'amount'>> = {
  HIVE: { precision: 3, nai: '@@000000021' },
  HBD: { precision: 3, nai: '@@000000013' },
  VESTS: { precision: 6, nai: '@@000000037' }
};

/**
 * The NAI form of a legacy asset string, written with exactly its symbol's precision
 * (`'1.000 HIVE'`, `'0.500 HBD'`, `'1.000000 VESTS'`). Throws on any other form, so an expected
 * value cannot silently round.
 */
export function naiAsset(legacy: string): NaiAsset {
  const match = /^(\d+)\.(\d+) ([A-Z]+)$/.exec(legacy);
  const symbol = match ? NAI_BY_SYMBOL[match[3]] : undefined;
  if (!match || !symbol || match[2].length !== symbol.precision) {
    throw new Error(`Not a HIVE, HBD or VESTS amount at its precision: ${legacy}`);
  }
  return { amount: BigInt(match[1] + match[2]).toString(), ...symbol };
}

interface ApiOperation {
  type?: unknown;
  value?: Record<string, unknown>;
}

/**
 * Asserts `call` carries a transaction of exactly one operation, of `type`, whose value has
 * exactly the fields of `expected`, each deep-equal to it.
 */
export function expectSingleOperation(call: InterceptedBroadcast, type: string, expected: object): void {
  const trx = (call.params as { trx?: { operations?: unknown } } | undefined)?.trx;
  expect(trx, 'broadcast params should include trx').toBeDefined();
  const operations = trx?.operations;
  expect(Array.isArray(operations) ? operations.length : operations, `${type} broadcast should carry exactly one operation`).toBe(1);

  const op = (operations as ApiOperation[])[0];
  expect(op?.type, 'operation.type').toBe(type);
  const value = op?.value ?? {};
  expect(Object.keys(value).sort(), `${type} fields`).toEqual(Object.keys(expected).sort());
  for (const [field, expectedValue] of Object.entries(expected)) {
    expect(value[field], `${type}.${field}`).toEqual(expectedValue);
  }
}
