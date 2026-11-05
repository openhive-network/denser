import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './time-ago') return nextResolve('./time-ago.ts', context);
    if (specifier === './locale-format-cache') return nextResolve('./locale-format-cache.ts', context);
    return nextResolve(specifier, context);
  }
});

const { formatCalendarDate } = await import('./calendar-date.ts');

describe('formatCalendarDate', () => {
  const cases: [string, string, string][] = [
    ['2021-03-23T08:00:00', 'en', '03/23/2021'],
    ['2021-03-23T08:00:00', 'pl', '23.03.2021'],
    ['2021-03-23T08:00:00', 'de', '23.03.2021'],
    ['2021-03-23T08:00:00', 'ja', '2021/03/23']
  ];
  for (const [date, lang, expected] of cases) {
    it(`formats ${date} in ${lang} as "${expected}"`, () => {
      assert.equal(formatCalendarDate(date, lang), expected);
    });
  }

  it('reads a zoneless chain timestamp as UTC, not local time', () => {
    assert.equal(formatCalendarDate('2021-03-23T23:30:00', 'pl'), '23.03.2021');
    assert.equal(formatCalendarDate('2021-03-24T00:30:00', 'pl'), '24.03.2021');
  });

  it('accepts a timestamp with a zone suffix', () => {
    assert.equal(formatCalendarDate('2021-03-23T23:30:00-02:00', 'pl'), '24.03.2021');
  });

  it('formats in English for a locale the runtime rejects', () => {
    assert.equal(formatCalendarDate('2021-03-23T08:00:00', 'not_a_locale!'), '03/23/2021');
  });
});
