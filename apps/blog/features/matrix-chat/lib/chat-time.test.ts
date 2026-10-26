import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDayHeading, formatMessageTime, isSameDay } from './chat-time.ts';

/** Monday 26 October 2026, mid-morning in the browser's time zone */
const NOW = new Date(2026, 9, 26, 10, 14).getTime();
const at = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
  new Date(year, month, day, hour, minute).getTime();

describe('chat message times', () => {
  it('writes the time the way the language does, not the browser', () => {
    const afternoon = at(9, 26, 12, 53);
    assert.equal(formatMessageTime(afternoon, 'pl'), '12:53');
    assert.match(formatMessageTime(afternoon, 'en'), /^12:53\sPM$/);
    assert.equal(formatMessageTime(at(9, 26, 21, 5), 'pl'), '21:05');
  });

  it('tells days of the browser time zone apart at midnight', () => {
    assert.equal(isSameDay(at(9, 26, 0, 0), at(9, 26, 23, 59)), true);
    assert.equal(isSameDay(at(9, 25, 23, 59), at(9, 26, 0, 0)), false);
  });
});

describe('chat day headings', () => {
  it('names today and yesterday, capitalized as a heading', () => {
    assert.equal(formatDayHeading(at(9, 26, 0, 1), NOW, 'en'), 'Today');
    assert.equal(formatDayHeading(at(9, 25, 23, 59), NOW, 'en'), 'Yesterday');
    assert.equal(formatDayHeading(at(9, 26), NOW, 'pl'), 'Dzisiaj');
    assert.equal(formatDayHeading(at(9, 25), NOW, 'pl'), 'Wczoraj');
  });

  it('names a day of the past week by its weekday', () => {
    assert.equal(formatDayHeading(at(9, 24), NOW, 'en'), 'Saturday');
    assert.equal(formatDayHeading(at(9, 20), NOW, 'en'), 'Tuesday');
    assert.equal(formatDayHeading(at(9, 24), NOW, 'pl'), 'sobota');
  });

  it('dates a day further back, with the year only when it is not this one', () => {
    assert.equal(formatDayHeading(at(9, 19), NOW, 'en'), 'Mon, Oct 19');
    assert.equal(formatDayHeading(at(11, 31, 12, 0, 2025), NOW, 'en'), 'Wed, Dec 31, 2025');
  });
});
