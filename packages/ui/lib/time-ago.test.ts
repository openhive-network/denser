import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getMinuteClockNow, getTimeAgoString, getTimeAgoTitle, subscribeMinuteClock } from './time-ago.ts';

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
    ['2026-10-06T12:05:00', 'en', 'now'],
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

describe('getTimeAgoTitle', () => {
  it('matches Date.prototype.toLocaleString for each locale', () => {
    for (const lang of ['en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh', 'ar']) {
      for (const date of ['2026-10-06T09:15:07', '2019-01-31T23:59:59', NOW]) {
        assert.equal(getTimeAgoTitle(date, lang), new Date(date).toLocaleString(lang), `${lang} ${date}`);
      }
    }
  });

  it('matches toLocaleString for an invalid date', () => {
    assert.equal(getTimeAgoTitle('not a date', 'en'), new Date('not a date').toLocaleString('en'));
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
