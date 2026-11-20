import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);

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
