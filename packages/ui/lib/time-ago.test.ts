import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './locale-format-cache') return nextResolve('./locale-format-cache.ts', context);
    return nextResolve(specifier, context);
  }
});

const {
  getMinuteClockNow,
  getTimeAgoDateTime,
  getTimeAgoFormatCacheSizes,
  getTimeAgoString,
  getTimeAgoTitle,
  getUnitsAgoString,
  subscribeMinuteClock
} = await import('./time-ago.ts');

const NOW = Date.UTC(2026, 9, 6, 12, 0, 0);
const MINUTE = 60000;

describe('getTimeAgoString', () => {
  const cases: [string, string, string][] = [
    ['2026-10-06T11:59:30', 'en', '30 seconds ago'],
    ['2026-10-06T11:58:30', 'en', '1 minute ago'],
    ['2026-10-06T09:15:00', 'en', '2 hours ago'],
    ['2026-10-05T11:00:00', 'en', 'yesterday'],
    ['2026-09-20T12:00:00', 'en', '2 weeks ago'],
    ['2024-10-06T12:00:00', 'en', '2 years ago'],
    ['2026-10-06T12:00:00', 'en', 'now'],
    ['2026-10-06T12:00:30', 'en', 'now'],
    ['2026-10-06T12:05:00', 'en', 'in 5 minutes'],
    ['2026-10-07T12:00:00', 'en', 'tomorrow'],
    ['2026-10-09T11:57:09', 'en', 'in 3 days'],
    ['2027-05-15T00:00:00', 'en', 'in 7 months'],
    ['2025-10-11T12:00:00', 'en', 'last year'],
    ['2027-09-28T12:00:00', 'en', 'next year'],
    ['2026-10-09T11:57:09', 'pl', 'za 3 dni'],
    ['2026-10-06T09:15:00', 'es', 'hace 2 horas'],
    ['2026-10-05T11:00:00', 'pl', 'wczoraj'],
    ['2026-10-06T11:58:30.000Z', 'en', '1 minute ago']
  ];

  for (const [date, lang, expected] of cases) {
    it(`formats ${date} in ${lang} as "${expected}"`, () => {
      assert.equal(getTimeAgoString(date, lang, NOW), expected);
    });
  }

  it('reads a zoneless Hive timestamp as UTC whatever the local timezone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Pacific/Kiritimati';
    try {
      assert.equal(getTimeAgoString('2026-10-06T09:15:00', 'en', NOW), '2 hours ago');
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it('accepts Date and epoch inputs', () => {
    assert.equal(getTimeAgoString(new Date(NOW - 3 * MINUTE), 'en', NOW), '3 minutes ago');
    assert.equal(getTimeAgoString(NOW - 3 * MINUTE, 'en', NOW), '3 minutes ago');
  });

  it('reports an unparsable date or locale as "Invalid date"', () => {
    assert.equal(getTimeAgoString('not a date', 'en', NOW), 'Invalid date');
    assert.equal(getTimeAgoString('2026-10-06T09:15:00', 'not_a_locale!', NOW), 'Invalid date');
  });
});

describe('getTimeAgoString in the narrow style', () => {
  const cases: [string, string, string][] = [
    ['2026-10-06T11:11:00', 'en', '49m ago'],
    ['2026-10-06T07:00:00', 'en', '5h ago'],
    ['2026-10-05T11:00:00', 'en', '1d ago'],
    ['2026-10-03T12:00:00', 'en', '3d ago'],
    ['2026-09-05T12:00:00', 'en', '1mo ago'],
    ['2026-10-06T12:05:00', 'en', 'in 5m'],
    ['2026-10-06T12:00:00', 'en', 'now'],
    ['2026-10-06T12:00:30', 'en', 'now'],
    ['2026-10-06T11:11:00', 'pl', '49 min temu'],
    ['2026-10-06T07:00:00', 'pl', '5 godz. temu'],
    ['2026-10-06T10:00:00', 'pl', '2 godz. temu'],
    ['2026-10-06T12:05:00', 'pl', 'za 5 min'],
    ['2026-10-06T17:00:00', 'pl', 'za 5 godz.'],
    ['2026-10-04T12:00:00', 'pl', '2 dni temu'],
    ['2026-10-03T12:00:00', 'pl', '3 dni temu'],
    ['2026-09-05T12:00:00', 'pl', '1 mies. temu'],
    ['2025-10-06T12:00:00', 'pl', '1 rok temu'],
    ['2025-11-05T12:00:00', 'pl', '11 mies. temu'],
    ['2025-10-11T12:00:00', 'pl', '1 rok temu'],
    ['2025-10-11T12:00:00', 'en', '1y ago'],
    ['2026-10-06T12:00:00', 'pl', 'teraz'],
    ['2026-10-06T11:11:00', 'es', 'hace 49 min'],
    ['2026-10-06T07:00:00', 'es', 'hace 5 h'],
    ['2026-10-06T11:11:00', 'ja', '49分前'],
    ['2026-10-06T07:00:00', 'ja', '5時間前'],
    ['2026-10-06T11:11:00', 'ru', '49 мин. назад'],
    ['2026-10-06T07:00:00', 'ru', '5 ч назад'],
    ['2026-09-05T12:00:00', 'ru', '1 мес. назад'],
    ['2025-10-06T12:00:00', 'ru', '1 г. назад'],
    ['2026-10-06T12:05:00', 'ru', 'через 5 мин.'],
    ['2026-10-06T12:00:00', 'ru', 'сейчас'],
    ['2026-10-06T11:11:00', 'fr', 'il y a 49\u00a0min']
  ];

  for (const [date, lang, expected] of cases) {
    it(`formats ${date} in ${lang} as "${expected}"`, () => {
      assert.equal(getTimeAgoString(date, lang, NOW, 'narrow'), expected);
    });
  }

  it('never shows a bare signed number', () => {
    for (const lang of ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh']) {
      for (const date of [
        '2026-10-06T11:11:00',
        '2026-10-05T11:00:00',
        '2025-10-06T12:00:00',
        '2026-10-09T12:00:00'
      ]) {
        const text = getTimeAgoString(date, lang, NOW, 'narrow');
        assert.doesNotMatch(text, /[-+\u2212]\s*\d/, `${lang} ${date}: ${text}`);
      }
    }
  });

  it('leaves the default style long', () => {
    assert.equal(getTimeAgoString('2026-10-06T11:11:00', 'en', NOW), '49 minutes ago');
    assert.equal(getTimeAgoString('2026-10-06T11:11:00', 'en', NOW, 'long'), '49 minutes ago');
  });

  it('reports an unparsable locale as "Invalid date"', () => {
    assert.equal(getTimeAgoString('2026-10-06T09:15:00', 'not_a_locale!', NOW, 'narrow'), 'Invalid date');
  });
});

describe('getUnitsAgoString', () => {
  const cases: [number, Intl.RelativeTimeFormatUnit, string, string][] = [
    [2, 'year', 'pl', '2 lata temu'],
    [3, 'year', 'pl', '3 lata temu'],
    [5, 'year', 'pl', '5 lat temu'],
    [22, 'year', 'pl', '22 lata temu'],
    [2, 'month', 'pl', '2 miesiące temu'],
    [12, 'month', 'pl', '12 miesięcy temu'],
    [1, 'month', 'pl', '1 miesiąc temu'],
    [3, 'hour', 'pl', '3 godziny temu'],
    [1, 'year', 'en', '1 year ago'],
    [3, 'week', 'en', '3 weeks ago'],
    [2, 'day', 'ru', '2 дня назад'],
    [5, 'day', 'ru', '5 дней назад']
  ];

  for (const [count, unit, lang, expected] of cases) {
    it(`formats ${count} ${unit} in ${lang} as "${expected}"`, () => {
      assert.equal(getUnitsAgoString(count, unit, lang), expected);
    });
  }

  it('throws RangeError for a locale the runtime rejects', () => {
    assert.throws(() => getUnitsAgoString(2, 'year', 'not_a_locale!'), RangeError);
  });
});

describe('getTimeAgoTitle', () => {
  it('matches Date.prototype.toLocaleString of the UTC instant for each locale', () => {
    for (const lang of ['en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh', 'ar']) {
      for (const [date, instant] of [
        ['2026-10-06T09:15:07', Date.UTC(2026, 9, 6, 9, 15, 7)],
        ['2019-01-31T23:59:59', Date.UTC(2019, 0, 31, 23, 59, 59)],
        [NOW, NOW]
      ] as const) {
        assert.equal(getTimeAgoTitle(date, lang), new Date(instant).toLocaleString(lang), `${lang} ${date}`);
      }
    }
  });

  it('shows a zoneless Hive timestamp in the local timezone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Europe/Warsaw';
    try {
      assert.equal(getTimeAgoTitle('2026-10-16T07:57:09', 'en-GB'), '16/10/2026, 09:57:09');
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it('matches toLocaleString for an invalid date', () => {
    assert.equal(getTimeAgoTitle('not a date', 'en'), new Date('not a date').toLocaleString('en'));
  });

  it('reports a locale the runtime rejects as "Invalid Date"', () => {
    assert.equal(getTimeAgoTitle('2026-10-06T09:15:00', '%%%'), 'Invalid Date');
    assert.equal(getTimeAgoTitle('2026-10-06T09:15:00', 'not_a_locale!'), 'Invalid Date');
  });
});

describe('time-ago formatter caches', () => {
  const formatIn = (lang: string) => {
    getTimeAgoString('2026-10-06T09:15:00', lang, NOW);
    getTimeAgoString('2026-10-06T09:15:00', lang, NOW, 'narrow');
    getUnitsAgoString(2, 'year', lang);
    getTimeAgoTitle('2026-10-06T09:15:00', lang);
  };

  it('do not grow under distinct tags that resolve to a locale already held', () => {
    // The app languages, and a language the runtime lacks, which resolves to its default locale.
    const held = ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh', 'qaa'];
    held.forEach(formatIn);
    const before = getTimeAgoFormatCacheSizes();

    for (let i = 0; i < 1000; i++) {
      formatIn(`${held[i % held.length]}-x-${i}`);
    }

    assert.deepEqual(getTimeAgoFormatCacheSizes(), before);
    assert.equal(getTimeAgoString('2026-10-06T09:15:00', 'en-x-123', NOW), '2 hours ago');
  });

  it('hold a bounded number of formatters whatever locales are asked for', () => {
    for (const numberingSystem of Intl.supportedValuesOf('numberingSystem')) {
      for (const lang of ['en', 'pl', 'ja']) {
        formatIn(`${lang}-u-nu-${numberingSystem}`);
      }
    }

    const { relative, narrow, numeric, title } = getTimeAgoFormatCacheSizes();
    assert.ok(relative <= 32, `relative cache holds ${relative}`);
    assert.ok(narrow <= 32, `narrow cache holds ${narrow}`);
    assert.ok(numeric <= 32, `numeric cache holds ${numeric}`);
    assert.ok(title <= 32, `title cache holds ${title}`);
  });
});

describe('getTimeAgoDateTime', () => {
  it('gives the UTC instant of a zoneless Hive timestamp with its zone designator', () => {
    assert.equal(getTimeAgoDateTime('2026-10-16T07:57:09'), '2026-10-16T07:57:09.000Z');
    assert.equal(getTimeAgoDateTime(NOW), '2026-10-06T12:00:00.000Z');
  });

  it('gives undefined for an unparsable date', () => {
    assert.equal(getTimeAgoDateTime('not a date'), undefined);
  });
});

describe('subscribeMinuteClock', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setInterval', 'Date'], now: NOW });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('runs one interval for all subscribers and stops it after the last unsubscribes', () => {
    const setIntervalSpy = mock.method(globalThis, 'setInterval');
    const clearIntervalSpy = mock.method(globalThis, 'clearInterval');
    const calls = [0, 0, 0];
    const unsubscribes = calls.map((_, index) => subscribeMinuteClock(() => calls[index]++));

    assert.equal(setIntervalSpy.mock.callCount(), 1);
    assert.equal(getMinuteClockNow(), NOW);

    mock.timers.tick(MINUTE);
    assert.deepEqual(calls, [1, 1, 1]);
    assert.equal(getMinuteClockNow(), NOW + MINUTE);

    unsubscribes[0]();
    unsubscribes[1]();
    assert.equal(clearIntervalSpy.mock.callCount(), 0);
    mock.timers.tick(MINUTE);
    assert.deepEqual(calls, [1, 1, 2]);

    unsubscribes[2]();
    assert.equal(clearIntervalSpy.mock.callCount(), 1);
    mock.timers.tick(MINUTE);
    assert.deepEqual(calls, [1, 1, 2]);

    setIntervalSpy.mock.restore();
    clearIntervalSpy.mock.restore();
  });

  it('restarts on the next subscription with the current time', () => {
    mock.timers.tick(5 * MINUTE + 1234);
    const unsubscribe = subscribeMinuteClock(() => {});
    assert.equal(getMinuteClockNow(), NOW + 5 * MINUTE + 1234);
    unsubscribe();
  });
});
