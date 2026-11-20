import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import Big from 'big.js';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('./') && !specifier.endsWith('.ts'))
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const {
  formatAbbreviatedAmount,
  formatAmount,
  formatDateTime,
  formatDollars,
  formatDuration,
  formatFileSize,
  formatLargestUnitDuration,
  formatList,
  formatNumber,
  formatPercent,
  getRelativeUnitString,
  getTimeAgoString,
  joinSentences
} = await import('./locale-format.ts');

const NBSP = ' ';
const NOW = Date.parse('2026-11-20T12:00:00Z');
const LOCALES = ['en', 'pl', 'ru', 'ja', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

// Grouping spaces (no-break, narrow no-break) and bidi marks read as plain text, so the expectations
// below stay legible; the exact characters are checked once, for Polish grouping.
const plain = (text: string) => text.replace(/[  ]/g, ' ').replace(/[‎‏؜]/g, '');

const expectPerLocale = (actual: (lang: Locale) => string, expected: Record<Locale, string>) => {
  for (const lang of LOCALES) assert.equal(plain(actual(lang)), expected[lang], lang);
};

describe('numbers and amounts', () => {
  it('groups and separates as the locale writes numbers', () => {
    expectPerLocale((lang) => formatNumber(new Big('12000'), lang, 3), {
      en: '12,000.000',
      pl: '12 000,000',
      ru: '12 000,000',
      ja: '12,000.000',
      ar: '12,000.000'
    });
    assert.equal(formatNumber(new Big('12000'), 'pl', 3), `12${NBSP}000,000`);
  });

  it('keeps an amount exact to its decimals and names its token', () => {
    expectPerLocale((lang) => formatAmount(new Big('12000'), 'HBD', lang), {
      en: '12,000.000 HBD',
      pl: '12 000,000 HBD',
      ru: '12 000,000 HBD',
      ja: '12,000.000 HBD',
      ar: '12,000.000 HBD'
    });
    assert.equal(formatAmount(new Big('0.0005'), 'HIVE', 'en'), '0.001 HIVE');
    assert.equal(formatAmount(-1.5, 'HP', 'en', 1), '-1.5 HP');
  });

  it('abbreviates an amount the same way at every width', () => {
    expectPerLocale((lang) => formatAbbreviatedAmount(new Big('651700'), 'HP', lang), {
      en: '651.7K HP',
      pl: '651,7K HP',
      ru: '651,7K HP',
      ja: '651.7K HP',
      ar: '651.7K HP'
    });
  });

  it('puts the dollar sign and the percent sign where the locale does', () => {
    expectPerLocale((lang) => formatDollars(1234.5, lang), {
      en: '$1,234.50',
      pl: '1234,50 $',
      ru: '1 234,50 $',
      ja: '$1,234.50',
      ar: '1,234.50 US$'
    });
    expectPerLocale((lang) => formatPercent(12.5, lang, 1), {
      en: '12.5%',
      pl: '12,5%',
      ru: '12,5 %',
      ja: '12.5%',
      ar: '12.5%'
    });
  });

  it('formats nothing for a value that is not a number', () => {
    assert.equal(formatNumber(NaN, 'en'), '');
    assert.equal(formatAmount(Infinity, 'HBD', 'en'), '');
    assert.equal(formatDollars(NaN, 'en'), '');
    assert.equal(formatPercent(NaN, 'en'), '');
  });

  it('formats a number and an amount for a tag the runtime rejects in English, without throwing', () => {
    assert.equal(formatNumber(new Big('1234.5'), 'not a tag!', 2), '1,234.50');
    assert.equal(formatAmount(1234.5, 'HBD', 'not a tag!'), '1,234.500 HBD');
    assert.equal(formatAbbreviatedAmount(new Big('651700'), 'HBD', 'not a tag!'), '651.7K HBD');
  });

  it('writes a file size in the locale', () => {
    assert.equal(formatFileSize(12.34 * 1024, 'en'), '12.3 kB');
    assert.equal(formatFileSize(3 * 1024 * 1024, 'pl'), '3 MB');
  });
});

describe('lists and sentences', () => {
  it('joins a list with the locale’s conjunction', () => {
    expectPerLocale((lang) => formatList(['1 HIVE', '2 HBD', '3 HP'], lang), {
      en: '1 HIVE, 2 HBD, and 3 HP',
      pl: '1 HIVE, 2 HBD i 3 HP',
      ru: '1 HIVE, 2 HBD и 3 HP',
      ja: '1 HIVE、2 HBD、3 HP',
      ar: '1 HIVE و2 HBD و3 HP'
    });
    assert.equal(formatList(['a'], 'en'), 'a');
    assert.equal(formatList(['a', 'b'], 'en', 'disjunction'), 'a or b');
    assert.equal(formatList(['a', 'b'], 'not a tag!'), 'a and b');
  });

  it('separates whole sentences with a space, except in Japanese and Chinese', () => {
    assert.equal(joinSentences(['Busy.', 'Try again in 5 s.'], 'en'), 'Busy. Try again in 5 s.');
    assert.equal(
      joinSentences(['混雑しています。', '5秒後に再試行してください。'], 'ja'),
      '混雑しています。5秒後に再試行してください。'
    );
    assert.equal(joinSentences(['忙。', '请重试。'], 'zh'), '忙。请重试。');
  });
});

describe('relative time and durations', () => {
  it('says how long ago with the plural form the locale needs', () => {
    expectPerLocale((lang) => getTimeAgoString('2026-11-20T09:00:00', lang, NOW), {
      en: '3 hours ago',
      pl: '3 godziny temu',
      ru: '3 часа назад',
      ja: '3 時間前',
      ar: 'قبل 3 ساعات'
    });
    expectPerLocale((lang) => getTimeAgoString('2024-11-20T12:00:00', lang, NOW), {
      en: '2 years ago',
      pl: '2 lata temu',
      ru: '2 года назад',
      ja: '2 年前',
      ar: 'قبل سنتين'
    });
    assert.equal(getTimeAgoString('2021-11-20T12:00:00', 'pl', NOW), '5 lat temu');
  });

  it('keeps the narrow style’s overrides: Polish "godz.", Russian with direction words', () => {
    assert.equal(getTimeAgoString('2026-11-20T09:00:00', 'pl', NOW, 'narrow'), '3 godz. temu');
    assert.equal(getTimeAgoString('2026-11-20T09:00:00', 'ru', NOW, 'narrow'), '3 ч назад');
    assert.equal(getTimeAgoString('2026-11-20T09:00:00', 'en', NOW, 'narrow'), '3h ago');
  });

  it('says when a future time comes and names yesterday', () => {
    expectPerLocale((lang) => getTimeAgoString('2026-11-23T12:00:00', lang, NOW), {
      en: 'in 3 days',
      pl: 'za 3 dni',
      ru: 'через 3 дня',
      ja: '3 日後',
      ar: 'خلال 3 أيام'
    });
    assert.equal(getRelativeUnitString(-1, 'day', 'pl'), 'wczoraj');
  });

  it('writes a duration unit by unit, skipping zero units', () => {
    expectPerLocale((lang) => formatDuration({ day: 2, hour: 5 }, lang), {
      en: '2 days, 5 hours',
      pl: '2 dni i 5 godzin',
      ru: '2 дня 5 часов',
      ja: '2 日 5 時間',
      ar: 'يومان و5 ساعات'
    });
    assert.equal(formatDuration({ day: 0, hour: 5 }, 'en'), '5 hours');
    assert.equal(formatDuration({ day: 1, hour: 0 }, 'pl'), '1 dzień');
    assert.equal(formatDuration({ day: 0, hour: 0 }, 'en'), '0 hours');
  });

  it('puts a duration after "in" in the accusative where the locale has one: pl "za", ru "через"', () => {
    expectPerLocale((lang) => formatDuration({ day: 2, hour: 1 }, lang, 'accusative'), {
      en: '2 days, 1 hour',
      pl: '2 dni i 1 godzinę',
      ru: '2 дня 1 час',
      ja: '2 日 1 時間',
      ar: 'يومان وساعة'
    });
    assert.equal(formatDuration({ day: 2, hour: 1 }, 'pl'), '2 dni i 1 godzina');
    assert.equal(formatDuration({ minute: 1 }, 'ru', 'accusative'), '1 минуту');
    assert.equal(formatDuration({ week: 21, second: 1 }, 'ru', 'accusative'), '21 неделю 1 секунду');
    assert.equal(formatDuration({ minute: 22 }, 'pl', 'accusative'), '22 minuty');
    assert.equal(formatDuration({ hour: 1 }, 'not a tag!', 'accusative'), '1 hour');
  });

  it('counts a long time in its largest unit, twelve months as a year', () => {
    expectPerLocale((lang) => formatLargestUnitDuration(5 * 365 * 86400, lang), {
      en: '5 years',
      pl: '5 lat',
      ru: '5 лет',
      ja: '5 年',
      ar: '5 سنوات'
    });
    assert.equal(formatLargestUnitDuration(360 * 86400, 'en'), '1 year');
    assert.equal(formatLargestUnitDuration(90, 'en'), '1 minute');
  });
});

describe('dates and times', () => {
  it('writes a chain date in the locale’s own date form', () => {
    expectPerLocale((lang) => formatDateTime('2026-05-15T09:46:00', lang, 'date', 'UTC'), {
      en: 'May 15, 2026',
      pl: '15 maja 2026',
      ru: '15 мая 2026 г.',
      ja: '2026年5月15日',
      ar: '15 مايو 2026'
    });
    assert.equal(formatDateTime('2026-05-15T09:46:00', 'pl', 'time', 'UTC'), '09:46');
    assert.equal(formatDateTime('2026-05-15T09:46:00', 'pl', 'dayMonth', 'UTC'), '15 maj');
  });

  it('formats an unparsable date as nothing and an unknown locale in English', () => {
    assert.equal(formatDateTime('not a date', 'en', 'date'), '');
    assert.equal(formatDateTime('2026-05-15T09:46:00', 'not a tag!', 'date', 'UTC'), 'May 15, 2026');
  });
});
