/** An Intl formatter: `resolvedOptions().locale` names the locale it actually formats in. */
interface LocaleFormatter {
  resolvedOptions(): { locale: string };
}

// A cap on top of keying by the resolved locale: the runtime resolves a tag's Unicode extensions
// (`en-u-nu-arab`), so the set of resolved locales is finite but large. Past the cap a formatter is
// built per call and dropped.
const MAX_CACHED_LOCALES = 32;

export interface LocaleFormatCache<F> {
  /** The formatter for `lang`; throws `RangeError` for a tag the Intl constructor rejects. */
  get(lang: string): F;
  /** Number of formatters held. */
  size(): number;
}

/**
 * Caches the formatters `create` builds, keyed by the locale each resolves to rather than the tag
 * asked for, so tags the runtime does not tell apart (`en-x-1`, `en-x-2`) share the `en` entry instead
 * of each adding one for the life of the process. A tag that is not its own resolved locale costs
 * one formatter construction per lookup.
 */
export function createLocaleFormatCache<F extends LocaleFormatter>(
  create: (lang: string) => F
): LocaleFormatCache<F> {
  const formats = new Map<string, F>();

  const get = (lang: string): F => {
    const cached = formats.get(lang);
    if (cached) return cached;

    const format = create(lang);
    const resolved = format.resolvedOptions().locale;
    const shared = formats.get(resolved);
    if (shared) return shared;

    if (formats.size < MAX_CACHED_LOCALES) {
      formats.set(resolved, format);
    }
    return format;
  };

  return { get, size: () => formats.size };
}
