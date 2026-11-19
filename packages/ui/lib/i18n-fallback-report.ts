import type { i18n, InitOptions, PostProcessorModule, TOptions } from 'i18next';

const PROCESSOR_NAME = 'reportFallback';

/** A key the requested language has no translation for: i18next rendered the fallback language or the key. */
export interface I18nFallback {
  language: string;
  namespace: string;
  key: string;
}

/** Where i18next found a translation (`postProcessPassResolved`); `res` is undefined when no language had it. */
interface ResolvedTranslation {
  res?: unknown;
  usedKey?: string;
  usedLng?: string;
  usedNS?: string;
}

const isResolvedTranslation = (value: unknown): value is ResolvedTranslation =>
  typeof value === 'object' && value !== null;

const resolvedOf = ({ i18nResolved }: TOptions): ResolvedTranslation | undefined =>
  isResolvedTranslation(i18nResolved) ? i18nResolved : undefined;

/**
 * Makes `instance` hand `report` each key it translates from another language than the requested
 * one (English, through `fallbackLng`), or from none at all, once per language, namespace and key for
 * the instance's lifetime. i18next's `missingKeyHandler` cannot do this: it is only called for a key no
 * language has, not for one the fallback language fills in. Lookups made before the namespace has
 * loaded are left out; they render again once it has.
 *
 * Call it before `instance.init`, and spread the returned options into the init options.
 */
export function reportFallbacks(instance: i18n, report: (fallback: I18nFallback) => void): InitOptions {
  const reported = new Set<string>();
  const processor: PostProcessorModule = {
    type: 'postProcessor',
    name: PROCESSOR_NAME,
    process(value, _key, options) {
      const resolved = resolvedOf(options);
      const language = options.lng ?? instance.language;
      if (!resolved?.usedKey || !resolved.usedNS || !language) return value;
      if (resolved.res !== undefined && resolved.usedLng === language) return value;
      if (!instance.hasLoadedNamespace(resolved.usedNS, { lng: language })) return value;
      const fallback = { language, namespace: resolved.usedNS, key: resolved.usedKey };
      const id = JSON.stringify(fallback);
      if (reported.has(id)) return value;
      reported.add(id);
      report(fallback);
      return value;
    }
  };
  instance.use(processor);
  return { postProcess: [PROCESSOR_NAME], postProcessPassResolved: true };
}
