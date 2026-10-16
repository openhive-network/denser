import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './time-ago') return nextResolve('./time-ago.ts', context);
    return nextResolve(specifier, context);
  }
});

const { formatMonthYear } = await import('./month-year.ts');

describe('formatMonthYear', () => {
  const cases: [string, string, string][] = [
    ['2020-07-15T08:00:00', 'en', 'July 2020'],
    ['2020-07-15T08:00:00', 'ko', '2020년 7월'],
    ['2020-07-15T08:00:00', 'pl', 'lipiec 2020'],
    ['2020-07-15T08:00:00', 'ja', '2020年7月'],
    ['2016-06-01T00:00:00', 'fr', 'juin 2016'],
    ['2016-06-01T00:00:00', 'es', 'junio de 2016']
  ];
  for (const [date, lang, expected] of cases) {
    it(`formats ${date} in ${lang} as "${expected}"`, () => {
      assert.equal(formatMonthYear(date, lang), expected);
    });
  }

  it('reads a zoneless chain timestamp as UTC, not local time', () => {
    assert.equal(formatMonthYear('2020-07-31T23:30:00', 'en'), 'July 2020');
    assert.equal(formatMonthYear('2020-08-01T00:30:00', 'en'), 'August 2020');
  });

  it('accepts a timestamp with a zone suffix', () => {
    assert.equal(formatMonthYear('2020-07-31T23:30:00-02:00', 'en'), 'August 2020');
  });
});
