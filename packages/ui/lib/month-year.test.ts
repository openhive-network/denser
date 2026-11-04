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

const { formatMonthYear, getMonthYearFormatCacheSize } = await import('./month-year.ts');

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

  it('formats in English for a locale the runtime rejects', () => {
    assert.equal(formatMonthYear('2020-07-15T08:00:00', '%%%'), 'July 2020');
    assert.equal(formatMonthYear('2020-07-15T08:00:00', 'not_a_locale!'), 'July 2020');
  });

  it('does not grow its cache under distinct tags that resolve to a locale already held', () => {
    // The app languages, and a language the runtime lacks, which resolves to its default locale.
    const held = ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh', 'qaa'];
    held.forEach((lang) => formatMonthYear('2020-07-15T08:00:00', lang));
    const before = getMonthYearFormatCacheSize();

    for (let i = 0; i < 1000; i++) {
      formatMonthYear('2020-07-15T08:00:00', `${held[i % held.length]}-x-${i}`);
    }

    assert.equal(getMonthYearFormatCacheSize(), before);
    assert.equal(formatMonthYear('2020-07-15T08:00:00', 'pl-x-7'), 'lipiec 2020');
  });
});
