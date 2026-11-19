import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import Big from 'big.js';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './locale-format-cache') return nextResolve('./locale-format-cache.ts', context);
    return nextResolve(specifier, context);
  }
});

const { formatDecimal, getRoundedAbbreveration } = await import('./math-utils.ts');

const NBSP = ' ';

describe('getRoundedAbbreveration', () => {
  const cases: [string, string, string][] = [
    ['540', 'en', '540'],
    ['540.5', 'en', '540.5'],
    ['0.004', 'en', '0'],
    ['999.999', 'en', '1K'],
    ['12000', 'en', '12K'],
    ['12340', 'en', '12.34K'],
    ['651700', 'en', '651.7K'],
    ['1234567', 'en', '1.23M'],
    ['240000000', 'en', '240M'],
    ['999995', 'en', '1M'],
    ['-12500', 'en', '-12.5K'],
    ['540', 'pl', '540'],
    ['12000', 'pl', '12K'],
    ['1234567', 'pl', '1,23M'],
    ['651700', 'pl', '651,7K'],
    ['12345.678', 'pl', '12,35K']
  ];
  for (const [amount, locale, expected] of cases) {
    it(`${amount} in ${locale} is ${expected}`, () => {
      assert.equal(getRoundedAbbreveration(Big(amount), locale), expected);
    });
  }

  it('rounds to the given number of decimals', () => {
    assert.equal(getRoundedAbbreveration(Big('1567'), 'en', 0), '2K');
    assert.equal(getRoundedAbbreveration(Big('12.5'), 'pl', 0), '13');
  });
});

describe('formatDecimal', () => {
  const cases: [string, number, string, string][] = [
    ['835', 3, 'en', '835.000'],
    ['12000', 3, 'en', '12,000.000'],
    ['232371.242', 3, 'en', '232,371.242'],
    ['23223141.0765', 3, 'en', '23,223,141.077'],
    ['20200', 2, 'en', '20,200.00'],
    ['-1234.5', 2, 'en', '-1,234.50'],
    ['42', 0, 'en', '42'],
    ['835', 3, 'pl', '835,000'],
    ['12000', 3, 'pl', `12${NBSP}000,000`],
    ['232371.242', 3, 'pl', `232${NBSP}371,242`],
    ['23223141.076', 3, 'pl', `23${NBSP}223${NBSP}141,076`]
  ];
  for (const [amount, decimals, locale, expected] of cases) {
    it(`${amount} to ${decimals} decimals in ${locale} is ${JSON.stringify(expected)}`, () => {
      assert.equal(formatDecimal(Big(amount), decimals, locale), expected);
    });
  }

  it('keeps digits a float would lose', () => {
    assert.equal(formatDecimal(Big('90071992547409.931'), 3, 'en'), '90,071,992,547,409.931');
  });
});
