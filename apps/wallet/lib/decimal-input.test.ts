import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless import: point `@ui/…` at the
// package's TypeScript source and give the package's relative imports their `.ts`.
const UI_ALIAS = '@ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(UI_ALIAS)) {
      const source = new URL(`../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
      return nextResolve(source.href, context);
    }
    const inUi = context.parentURL?.includes('/packages/ui/');
    if (inUi && specifier.startsWith('./') && !specifier.endsWith('.ts'))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const { parseDecimalInput, toMachineDecimal, withDecimalPoint } = await import('./decimal-input.ts');

describe('amount input in a locale with a decimal point', () => {
  it('reads "." as the decimal point', () => {
    assert.equal(parseDecimalInput('1.5', 'en'), 1.5);
    assert.equal(parseDecimalInput(' 0.125 ', 'ja'), 0.125);
    assert.equal(parseDecimalInput('12', 'en'), 12);
    assert.equal(parseDecimalInput(2, 'en'), 2);
  });

  it('refuses a "," rather than reading a thousands separator as the decimal point', () => {
    for (const locale of ['en', 'ja', 'ko', 'zh', 'ar']) {
      assert.ok(Number.isNaN(parseDecimalInput('1,000', locale)), locale);
      assert.equal(withDecimalPoint('1,', locale), null, locale);
    }
    assert.ok(Number.isNaN(parseDecimalInput('12,500', 'en')));
    assert.equal(toMachineDecimal('1,5', 'en'), '');
  });
});

describe('amount input in a locale with a decimal comma', () => {
  it('reads "," as the decimal point, as a pl reader means it', () => {
    assert.equal(parseDecimalInput('1,5', 'pl'), 1.5);
    assert.equal(parseDecimalInput('1,000', 'pl'), 1);
    assert.equal(parseDecimalInput(' 0,125 ', 'ru'), 0.125);
    assert.equal(parseDecimalInput(',5', 'fr'), 0.5);
    assert.equal(parseDecimalInput('-1,5', 'es'), -1.5);
    assert.equal(parseDecimalInput('1.5', 'pl'), 1.5);
  });

  it('keeps the amount in machine format for the chain', () => {
    assert.equal(toMachineDecimal('1,5', 'pl'), '1.5');
    assert.equal(toMachineDecimal('12', 'pl'), '12');
    assert.equal(withDecimalPoint('1,', 'it'), '1.');
  });
});

describe('malformed amounts in every locale', () => {
  it('refuses both separators or more than one rather than guessing', () => {
    for (const locale of ['en', 'pl']) {
      assert.ok(Number.isNaN(parseDecimalInput('1.000,5', locale)), locale);
      assert.ok(Number.isNaN(parseDecimalInput('1,000.5', locale)), locale);
      assert.ok(Number.isNaN(parseDecimalInput('1,5,0', locale)), locale);
      assert.ok(Number.isNaN(parseDecimalInput('1.000.000', locale)), locale);
      assert.equal(withDecimalPoint('1..', locale), null, locale);
    }
  });

  it('reads an empty or non-numeric amount as no number', () => {
    assert.ok(Number.isNaN(parseDecimalInput('', 'en')));
    assert.ok(Number.isNaN(parseDecimalInput('1 000,5', 'pl')));
    assert.ok(Number.isNaN(parseDecimalInput('abc', 'pl')));
    assert.equal(toMachineDecimal('1.', 'en'), '');
  });
});
