import { createLocaleFormatCache, getFormatOrEnglish, type LocaleFormatCache } from './locale-format-cache';
import { toLargestUnit, type TimeUnit } from './time-ago';

const DURATION_UNITS: readonly TimeUnit[] = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

/** A length of time as a count per unit: `{ day: 2, hour: 5 }`. */
export type Duration = Partial<Record<TimeUnit, number>>;

/**
 * The grammatical case a duration takes in its sentence: `nominative` on its own ("2 dni i 1 godzina"),
 * `accusative` after a preposition of time such as pl "za", ru "через" ("za 2 dni i 1 godzinę").
 */
export type DurationCase = 'nominative' | 'accusative';

// The accusative of the unit names Intl gives in the nominative, where the two differ: feminine
// nouns in their singular form (pl "1 godzina", ru "1 минута", "21 минута"). Every other form, and
// every unit name of the other locales, reads the same in both cases.
const ACCUSATIVE_UNIT_NAMES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  pl: { godzina: 'godzinę', minuta: 'minutę', sekunda: 'sekundę' },
  ru: { неделя: 'неделю', минута: 'минуту', секунда: 'секунду' }
};

const unitFormats = new Map<TimeUnit, LocaleFormatCache<Intl.NumberFormat>>();
const unitListFormats = createLocaleFormatCache(
  // eslint-disable-next-line no-restricted-syntax -- the locale formatting module's own formatter
  (lang) => new Intl.ListFormat(lang, { type: 'unit', style: 'long' })
);

const formatUnit = (count: number, unit: TimeUnit, lang: string, grammaticalCase: DurationCase): string => {
  let cache = unitFormats.get(unit);
  if (!cache) {
    cache = createLocaleFormatCache(
      // eslint-disable-next-line no-restricted-syntax -- the locale formatting module's own formatter
      (locale) => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' })
    );
    unitFormats.set(unit, cache);
  }
  const format = getFormatOrEnglish(cache, lang);
  if (grammaticalCase === 'nominative') return format.format(count);
  const accusatives = ACCUSATIVE_UNIT_NAMES[new Intl.Locale(format.resolvedOptions().locale).language] ?? {};
  return format
    .formatToParts(count)
    .map((part) => (part.type === 'unit' ? (accusatives[part.value] ?? part.value) : part.value))
    .join('');
};

/**
 * `duration` in `lang`, each non-zero unit with its plural form, largest first, joined as the locale
 * joins units: "2 days, 5 hours", pl "2 dni i 5 godzin", ru "2 дня 5 часов". A duration of all zeros
 * reads as zero of its smallest unit ("0 hours"). `grammaticalCase` is the case the sentence puts it in:
 * pl "za {{time}}" takes `accusative`, "za 2 dni i 1 godzinę". A tag the runtime rejects formats in
 * English.
 */
export const formatDuration = (
  duration: Duration,
  lang: string,
  grammaticalCase: DurationCase = 'nominative'
): string => {
  const units = DURATION_UNITS.filter((unit) => duration[unit] !== undefined);
  const parts = units
    .filter((unit) => duration[unit] !== 0)
    .map((unit) => formatUnit(duration[unit] ?? 0, unit, lang, grammaticalCase));
  if (parts.length === 0) return formatUnit(0, units[units.length - 1] ?? 'second', lang, grammaticalCase);
  return getFormatOrEnglish(unitListFormats, lang).format(parts);
};

/**
 * `seconds` in the largest unit it holds at least one whole of, truncated, without a direction:
 * "5 years", pl "5 lat", "3 days". For "… ago" use `getTimeAgoString` or `getUnitsAgoString`.
 */
export const formatLargestUnitDuration = (seconds: number, lang: string): string => {
  const [count, unit] = toLargestUnit(seconds);
  return formatDuration({ [unit]: count }, lang);
};
