import moment from 'moment';
import { TFunction } from 'i18next';

moment.relativeTimeThreshold('s', 60);
moment.relativeTimeThreshold('m', 60);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('d', 30);
moment.relativeTimeThreshold('M', 12);

export const dateToShow = (d: string, t: TFunction<'common_wallet', undefined>): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = moment(new Date(isTimeZoned)).format('MMMM YYYY');
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
  const dm = moment(new Date(isTimeZoned));

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

export const dateToFullRelative = (d: string, t: TFunction<'common_wallet', undefined>): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = moment(new Date(isTimeZoned));

  // Check if the date is more than 24 hours ago
  if (moment().diff(dm, 'days') >= 1) {
    const today = moment().format('L');
    return dm
      .from(today)
      .replace('days ago', t('global.time_ago.days'))
      .replace('a day ago', t('global.time_ago.a_day'))
      .replace('months ago', t('global.time_ago.months'))
      .replace('a month ago', t('global.time_ago.a_month'))
      .replace('years ago', t('global.time_ago.years'))
      .replace('a year ago', t('global.time_ago.a_year'))
      .replace('hours ago', t('global.time_ago.hours'));
  }
  const dd = dm
    .fromNow()
    .replace('a few seconds ago', t('global.time_ago.a_few_seconds'))
    .replace('seconds ago', t('global.time_ago.seconds'))
    .replace('minutes ago', t('global.time_ago.minutes'))
    .replace('a minute ago', t('global.time_ago.a_minute'))
    .replace('hours ago', t('global.time_ago.hours'))
    .replace('an hour ago', t('global.time_ago.an_hour'));

  return dd;
};

export const dateToFormatted = (d: string, format: string = 'LLLL'): string => {
  const isTimeZoned = d.indexOf('.') !== -1 || d.indexOf('+') !== -1 ? d : `${d}.000Z`;
  const dm = moment(new Date(isTimeZoned));
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
  if (!d) moment(new Date(isTimeZoned));
  try {
    const date = moment(d).isValid() ? moment(d).toDate() : new Date();
    return moment(new Date(date.getTime() - date.getTimezoneOffset() * 60000)).toString();
  } catch (e) {
    return moment(new Date(isTimeZoned)).toString();
  }
};

export const parseDate2 = (d: string): Date => {
  if (!d) return new Date();
  try {
    const date = moment(d).isValid() ? moment(d).toDate() : new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  } catch (e) {
    return new Date();
  }
};

export default parseDate;
