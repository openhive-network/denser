import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import { TFunction } from 'i18next';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);

export const dateToShow = (d: string, t: TFunction<'common_wallet', undefined>): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = dayjs(new Date(isTimeZoned)).format('MMMM YYYY');
  const dd = dm
    .replace('January', t('global.months.first'))
    .replace('February', t('global.months.second'))
    .replace('March', t('global.months.third'))
    .replace('April', t('global.months.fourth'))
    .replace('May', t('global.months.fifth'))
    .replace('June', t('global.months.sixth'))
    .replace('July', t('global.months.seventh'))
    .replace('August', t('global.months.eighth'))
    .replace('September', t('global.months.ninth'))
    .replace('October', t('global.months.tenth'))
    .replace('November', t('global.months.eleventh'))
    .replace('December', t('global.months.twelfth'));

  return dd;
};

export const dateToRelative = (d: string, t: TFunction<'common_wallet', undefined>): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = dayjs(new Date(isTimeZoned));

  const dd = dm
    .fromNow()
    .replace('a few seconds', t('global.time.a_few_seconds'))
    .replace(' seconds', t('global.time.seconds'))
    .replace(' minutes', t('global.time.minutes'))
    .replace(' a minute', t('global.time.a_minute'))
    .replace(' hours', t('global.time.hours'))
    .replace(' an hour', t('global.time.an_hour'))
    .replace(' days', t('global.time.days'))
    .replace(' a day', t('global.time.a_day'))
    .replace(' months', t('global.time.months'))
    .replace(' a month', t('global.time.a_month'))
    .replace(' years', t('global.time.years'))
    .replace(' a year', t('global.time.a_year'));
  return dd;
};

export const dateToFormatted = (d: string, format: string = 'LLLL'): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = dayjs(new Date(isTimeZoned));
  return dm.format(format);
};

export const dayDiff = (d: string) => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const a = new Date(isTimeZoned);
  const b = new Date();

  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};

export const hourDiff = (d: string) => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  let diff = (new Date().getTime() - new Date(isTimeZoned).getTime()) / 1000;
  diff /= 60 * 60;
  return Math.abs(Math.round(diff));
};

export const secondDiff = (d: string) => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  let diff = (new Date().getTime() - new Date(isTimeZoned).getTime()) / 1000;
  return Math.abs(Math.round(diff));
};

const parseDate = (d: string): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  if (!d) dayjs(new Date(isTimeZoned));
  try {
    const date = dayjs(d).isValid() ? dayjs(d).toDate() : new Date();
    // Format: "Fri Jun 18 2021"
    return dayjs(new Date(date.getTime() - date.getTimezoneOffset() * 60000)).format(
      'ddd MMM DD YYYY'
    );
  } catch (e) {
    return dayjs(new Date(isTimeZoned)).format('ddd MMM DD YYYY');
  }
};

/**
 * Formats a chain timestamp (UTC, with or without a zone suffix) as its UTC calendar date,
 * e.g. "Fri Jun 18 2021". Unlike `parseDate`, the result does not depend on the runtime's time
 * zone, so it is safe to render on the server and hydrate in the browser.
 */
export const formatUtcDate = (d: string): string => dayjs.utc(d).format('ddd MMM DD YYYY');

export const parseDate2 = (d: string): Date => {
  if (!d) return new Date();
  try {
    const date = dayjs(d).isValid() ? dayjs(d).toDate() : new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  } catch (e) {
    return new Date();
  }
};

export default parseDate;
