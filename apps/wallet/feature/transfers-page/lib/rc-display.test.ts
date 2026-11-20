import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path aliases nor an extensionless import: point `@ui/…` and
// `@/wallet/…` at their TypeScript source and give the relative imports there their `.ts`.
const ALIASES: Record<string, string> = {
  '@ui/': '../../../../../packages/ui/',
  '@/wallet/': '../../../'
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const alias = Object.keys(ALIASES).find((prefix) => specifier.startsWith(prefix));
    if (alias) {
      const source = new URL(`${ALIASES[alias]}${specifier.slice(alias.length)}.ts`, import.meta.url);
      return nextResolve(source.href, context);
    }
    const inSource = context.parentURL?.includes('/packages/ui/') || context.parentURL?.includes('/apps/wallet/');
    if (inSource && specifier.startsWith('.') && !specifier.endsWith('.ts'))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const { formatRcInput, rawRcToBillions, rcForPercent, roundRcMinimum } = await import('./rc-amount.ts');
const { formatRcMinimum, formatRcSummary, toRcInputText } = await import('./rc-display.ts');
const { parseDecimalInput, withDecimalPoint } = await import('../../../lib/decimal-input.ts');

const MAX = rawRcToBillions('5797055662');
const LARGE_MAX = rawRcToBillions('1234567891234');
const MINIMUM = rawRcToBillions('1604473654');
const PERCENT_PRESETS = [25, 50, 75, 100];

describe('RC amounts shown in sentences', () => {
  it('rounds a summary to two decimals in the locale', () => {
    assert.equal(formatRcSummary(rcForPercent(MAX, 25), 'pl'), '1,45');
    assert.equal(formatRcSummary(rcForPercent(MAX, 25), 'en'), '1.45');
    assert.equal(formatRcSummary(rawRcToBillions('1000000000000'), 'en'), '1,000.00');
  });

  it('states a minimum rounded up in the locale', () => {
    assert.equal(formatRcMinimum(MINIMUM, 'pl'), '1,61');
    assert.equal(formatRcMinimum(MINIMUM, 'en'), '1.61');
  });
});

describe('RC amounts the dialog writes into its amount input', () => {
  it('writes the locale decimal separator and no grouping', () => {
    assert.equal(toRcInputText(formatRcInput(MAX), 'en'), '5.797055662');
    assert.equal(toRcInputText(formatRcInput(MAX), 'pl'), '5,797055662');
    assert.equal(toRcInputText(formatRcInput(MAX), 'es'), '5,797055662');
    assert.equal(toRcInputText(formatRcInput(LARGE_MAX), 'en'), '1234.567891234');
    assert.equal(toRcInputText('1.', 'pl'), '1,');
  });

  for (const locale of ['en', 'pl', 'es', 'it']) {
    for (const max of [MAX, LARGE_MAX]) {
      const values = [
        { name: 'minimum', billions: roundRcMinimum(MINIMUM) },
        { name: 'large minimum', billions: roundRcMinimum(rawRcToBillions('1000004473654')) },
        ...PERCENT_PRESETS.map((percent) => ({ name: `${percent} %`, billions: rcForPercent(max, percent) })),
        { name: 'slider 37 %', billions: rcForPercent(max, 37) }
      ];
      for (const { name, billions } of values) {
        it(`reads the ${name} of ${max.toString()} back in ${locale}`, () => {
          const machine = formatRcInput(billions);
          const shown = toRcInputText(machine, locale);
          assert.equal(withDecimalPoint(shown, locale), machine);
          assert.equal(parseDecimalInput(shown, locale), Number(billions.toString()));
        });
      }
    }
  }
});
